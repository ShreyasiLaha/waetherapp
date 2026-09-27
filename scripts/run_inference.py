"""
RituGrid Phase 2 — Batch Inference & Skill Score Engine
Runs trained blending models across all available dates and lead times.
Produces:
  /data/output/blended_{var}_{date}_lt{lt}h.nc  — blended forecast
  /data/output/weights_{var}_{date}_lt{lt}h.nc  — per-model weight grids
  /data/output/skill_scores.json                 — RMSE & ACC comparison
  /data/output/extreme_guidance_{date}.json      — IMD hazard alerts

Follows Schema.md §2-5. Must not flatten extreme peaks (Rules.md §3).
"""
import sys
import json
import logging
import pickle
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
import xarray as xr

from src.config import (
    REGRIDDED_DATA_DIR,
    TRUTH_DATA_DIR,
    OUTPUT_DIR,
    MODELS_DIR,
    FEATURES_DIR,
    SOURCE_MODELS,
    VARIABLES,
    TARGET_LATS,
    TARGET_LONS,
    LEAD_TIMES,
)
from src.blending_model import FEATURE_COLS, derive_weights, fill_missing_models

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ─── Skill Score Helpers ─────────────────────────────────────────────────────

def compute_rmse(pred: np.ndarray, truth: np.ndarray) -> float:
    """RMSE over all valid (non-NaN) cells."""
    mask = ~(np.isnan(pred) | np.isnan(truth))
    if mask.sum() == 0:
        return float("nan")
    return float(np.sqrt(np.mean((pred[mask] - truth[mask]) ** 2)))


def compute_acc(pred: np.ndarray, truth: np.ndarray) -> float:
    """
    Anomaly Correlation Coefficient (ACC) vs ERA5 climatology anomaly.
    ACC = corr(pred - clim, truth - clim) where clim = spatial mean of truth.
    """
    clim = float(np.nanmean(truth))
    pred_anom  = pred - clim
    truth_anom = truth - clim
    mask = ~(np.isnan(pred_anom) | np.isnan(truth_anom))
    if mask.sum() < 2:
        return float("nan")
    pa = pred_anom[mask]
    ta = truth_anom[mask]
    denom = np.std(pa) * np.std(ta)
    if denom < 1e-12:
        return 0.0
    return float(np.corrcoef(pa, ta)[0, 1])


def redistribute_weights(weights_dict: dict, disabled: list[str]) -> dict:
    """
    Serving-time fallback: redistribute weights of disabled models proportionally.
    Implements Rules.md §6 — must NOT be baked into the trained model.
    """
    active = {m: w for m, w in weights_dict.items() if m not in disabled}
    total = sum(active.values())
    if total < 1e-12:
        equal = 1.0 / len(active) if active else 0.0
        return {m: equal for m in active}
    return {m: w / total for m, w in active.items()}


# ─── Inference Core ──────────────────────────────────────────────────────────

def run_inference_for_date(date_str: str, var_name: str, pipeline) -> bool:
    """
    Runs the trained blending model over the full Indian subcontinent grid
    for all lead times and a given date + variable.
    Writes blended_*.nc, weights_*.nc, and returns skill score data.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load truth
    truth_path = TRUTH_DATA_DIR / "era5" / f"{var_name}_{date_str}.nc"
    if not truth_path.exists():
        log.warning("No ERA5 truth for %s %s, skipping inference.", var_name, date_str)
        return False

    with xr.open_dataset(truth_path) as ds:
        truth_arr = ds[var_name].values[0].astype(np.float32)  # (lat, lon)

    # Load model arrays
    model_arrays = {}
    for model_id in SOURCE_MODELS:
        p = REGRIDDED_DATA_DIR / model_id / f"{var_name}_{date_str}.nc"
        if p.exists():
            with xr.open_dataset(p) as ds:
                model_arrays[model_id] = ds[var_name].values[0].astype(np.float32)
        else:
            model_arrays[model_id] = None
            log.warning("Missing model %s for %s %s — will use fallback.", model_id, var_name, date_str)

    n_lat, n_lon = len(TARGET_LATS), len(TARGET_LONS)
    dt = pd.Timestamp(date_str)
    doy = dt.day_of_year

    skill_by_lt = {}

    for lt in LEAD_TIMES:
        lt_decay = 1.0 - 0.02 * (lt / 24 - 1)

        # Build feature matrix for entire grid at this lead time
        n_cells = n_lat * n_lon
        lat_grid, lon_grid = np.meshgrid(TARGET_LATS, TARGET_LONS, indexing="ij")

        nwp1_flat = (model_arrays["model_nwp1"] * lt_decay).ravel() if model_arrays["model_nwp1"] is not None else np.full(n_cells, np.nan)
        nwp2_flat = (model_arrays["model_nwp2"] * lt_decay).ravel() if model_arrays["model_nwp2"] is not None else np.full(n_cells, np.nan)
        ai1_flat  = (model_arrays["model_ai1"] * (lt_decay ** 1.5)).ravel() if model_arrays["model_ai1"] is not None else np.full(n_cells, np.nan)

        # Cross-model variance per cell
        stacked = np.stack([nwp1_flat, nwp2_flat, ai1_flat], axis=1)
        cross_var_flat = np.nanvar(stacked, axis=1).astype(np.float32)

        X = np.column_stack([
            nwp1_flat,
            nwp2_flat,
            ai1_flat,
            cross_var_flat,
            np.full(n_cells, doy),
            np.full(n_cells, lt),
            lat_grid.ravel(),
            lon_grid.ravel(),
        ]).astype(np.float32)

        # Impute NaNs for missing models (fallback — serving layer)
        X_df = pd.DataFrame(X, columns=FEATURE_COLS)
        model_cols = ["model_nwp1_value", "model_nwp2_value", "model_ai1_value"]
        for col in model_cols:
            if X_df[col].isna().all():
                other = [c for c in model_cols if c != col]
                X_df[col] = X_df[other].mean(axis=1)
            else:
                X_df[col] = X_df[col].fillna(X_df[model_cols].mean(axis=1))
        X_clean = X_df.values

        # Blended forecast
        blended_flat = pipeline.predict(X_clean).astype(np.float32)

        # Enforce non-negative for precipitation and wind
        if var_name in ("tp", "ws10"):
            blended_flat = np.clip(blended_flat, 0.0, None)

        blended_2d = blended_flat.reshape(n_lat, n_lon)

        # ── Per-cell weights via sensitivity attribution ───────────────────
        # Sample on a coarse grid (every 4th cell) for speed, then interpolate
        step = 4
        weight_grids = {m: np.zeros((n_lat, n_lon), dtype=np.float32) for m in SOURCE_MODELS}
        for i in range(0, n_lat, step):
            for j in range(0, n_lon, step):
                cell_idx = i * n_lon + j
                cell_series = pd.Series(X_clean[cell_idx], index=FEATURE_COLS)
                w = derive_weights(cell_series, pipeline, var_name)
                # Fill step×step block
                i_end = min(i + step, n_lat)
                j_end = min(j + step, n_lon)
                for m in SOURCE_MODELS:
                    weight_grids[m][i:i_end, j:j_end] = w[m]

        # ── Write blended forecast NetCDF ──────────────────────────────────
        out_path_blend = OUTPUT_DIR / f"blended_{var_name}_{date_str}_lt{lt}h.nc"
        blended_ds = xr.Dataset(
            {var_name: (["time", "lat", "lon"], blended_2d[np.newaxis, ...])},
            coords={"time": [dt.to_pydatetime()], "lat": TARGET_LATS, "lon": TARGET_LONS},
            attrs={"source": "RituGrid Adaptive Blender", "lead_time_hours": lt, "variable": var_name}
        )
        blended_ds.to_netcdf(out_path_blend)

        # ── Write weight maps NetCDF ────────────────────────────────────────
        out_path_wt = OUTPUT_DIR / f"weights_{var_name}_{date_str}_lt{lt}h.nc"
        weight_data_vars = {
            f"weight_{m}": (["time", "lat", "lon"], weight_grids[m][np.newaxis, ...])
            for m in SOURCE_MODELS
        }
        weight_ds = xr.Dataset(
            weight_data_vars,
            coords={"time": [dt.to_pydatetime()], "lat": TARGET_LATS, "lon": TARGET_LONS},
            attrs={"lead_time_hours": lt, "variable": var_name}
        )
        weight_ds.to_netcdf(out_path_wt)

        # ── Skill scores for this lead time ────────────────────────────────
        rmse_blended = compute_rmse(blended_2d, truth_arr)
        acc_blended  = compute_acc(blended_2d, truth_arr)

        lt_scores = {"blended": {"rmse": round(rmse_blended, 4), "acc": round(acc_blended, 4)}}
        for model_id, col_vals in zip(SOURCE_MODELS, [nwp1_flat, nwp2_flat, ai1_flat]):
            m_arr = col_vals.reshape(n_lat, n_lon)
            lt_scores[model_id] = {
                "rmse": round(compute_rmse(m_arr, truth_arr), 4),
                "acc":  round(compute_acc(m_arr, truth_arr), 4),
            }

        skill_by_lt[lt] = lt_scores
        log.info("  [%s | %s | lt+%dh] Blended RMSE=%.4f ACC=%.4f | NWP1=%.4f NWP2=%.4f AI1=%.4f",
                 date_str, var_name, lt,
                 rmse_blended, acc_blended,
                 lt_scores["model_nwp1"]["rmse"],
                 lt_scores["model_nwp2"]["rmse"],
                 lt_scores["model_ai1"]["rmse"])

    return skill_by_lt


# ─── Extreme Guidance Generator ───────────────────────────────────────────────

def generate_extreme_guidance(date_str: str) -> dict:
    """
    Scans blended output for IMD-threshold extreme events across all variables.
    Outputs structured guidance per Schema.md §6 /extreme-guidance format.
    """
    guidance = {"date": date_str, "lead_time_scores": {}, "alerts": []}

    imd_thresholds = {
        "tp":   {"label": "heavy_rainfall",  "threshold_val": 64.5,  "threshold_str": ">= 64.5 mm/day", "unit": "mm/day"},
        "t2m":  {"label": "heatwave",        "threshold_val": 313.15,"threshold_str": ">= 40.0 degC",   "unit": "K"},
        "ws10": {"label": "high_wind",       "threshold_val": 13.89, "threshold_str": ">= 50.0 km/h",   "unit": "m/s"},
    }

    for var_name, info in imd_thresholds.items():
        for lt in LEAD_TIMES:
            blend_path = OUTPUT_DIR / f"blended_{var_name}_{date_str}_lt{lt}h.nc"
            wt_path    = OUTPUT_DIR / f"weights_{var_name}_{date_str}_lt{lt}h.nc"
            if not blend_path.exists():
                continue
            with xr.open_dataset(blend_path) as ds:
                arr = ds[var_name].values[0]
            with xr.open_dataset(wt_path) as ds:
                # Dominant model: the one with highest weight per cell
                weight_arrs = {m: ds[f"weight_{m}"].values[0] for m in SOURCE_MODELS}
                dominant_grid = np.array(SOURCE_MODELS)[
                    np.argmax(np.stack(list(weight_arrs.values()), axis=0), axis=0)
                ]

            extreme_mask = arr >= info["threshold_val"]
            n_cells = int(extreme_mask.sum())
            if n_cells == 0:
                continue

            peak_val = float(arr[extreme_mask].max())
            # Most common dominant model in extreme cells
            dom_in_extreme = dominant_grid[extreme_mask]
            dom_model = str(pd.Series(dom_in_extreme).mode()[0])

            guidance["alerts"].append({
                "variable":           var_name,
                "lead_time_hours":    lt,
                "type":               info["label"],
                "threshold":          info["threshold_str"],
                "max_value":          round(peak_val, 2),
                "affected_cells":     n_cells,
                "dominant_model_used": dom_model,
            })

    return guidance


# ─── Main Orchestration ───────────────────────────────────────────────────────

def run_all_inference():
    """Run batch inference for all variables and dates, save all outputs."""
    all_skill_records = []

    # Load truth dates from ERA5 truth directory
    truth_dates = sorted(set(
        f.stem.split("_")[1]
        for f in (TRUTH_DATA_DIR / "era5").glob("*.nc")
    ))

    if not truth_dates:
        log.error("No truth files found. Run procure_data.py first.")
        return

    log.info("Starting batch inference for %d dates: %s", len(truth_dates), truth_dates)

    for var_name in VARIABLES:
        model_path = MODELS_DIR / f"blender_{var_name}_v1.pkl"
        if not model_path.exists():
            log.error("Model %s not found. Run train_blender.py first.", model_path.name)
            continue

        with open(model_path, "rb") as f:
            pipeline = pickle.load(f)

        log.info("Running inference for variable: %s", var_name)
        for date_str in truth_dates:
            skill_by_lt = run_inference_for_date(date_str, var_name, pipeline)
            if not skill_by_lt:
                continue
            for lt, scores in skill_by_lt.items():
                record = {
                    "date":           date_str,
                    "variable":       var_name,
                    "lead_time_hours": lt,
                    "scores":         scores,
                }
                all_skill_records.append(record)

    # Save consolidated skill scores
    out_skill = OUTPUT_DIR / "skill_scores.json"
    with open(out_skill, "w") as f:
        json.dump(all_skill_records, f, indent=2)
    log.info("[OK] Saved skill_scores.json with %d entries.", len(all_skill_records))

    # Generate extreme guidance for each date
    for date_str in truth_dates:
        guidance = generate_extreme_guidance(date_str)
        out_guide = OUTPUT_DIR / f"extreme_guidance_{date_str}.json"
        with open(out_guide, "w") as f:
            json.dump(guidance, f, indent=2)
    log.info("[OK] Saved extreme guidance JSON files for %d dates.", len(truth_dates))

    # Print summary comparison table
    print("\n" + "=" * 75)
    print("RITUGRID SKILL SCORE SUMMARY (Blended vs Individual Models)")
    print("=" * 75)
    print(f"{'Date':<12} {'Var':<6} {'LT':>5}h  {'Blended':>8}  {'NWP1':>8}  {'NWP2':>8}  {'AI1':>8}  {'Beat?':<6}")
    print("-" * 75)
    for rec in all_skill_records:
        s = rec["scores"]
        bl  = s["blended"]["rmse"]
        n1  = s["model_nwp1"]["rmse"]
        n2  = s["model_nwp2"]["rmse"]
        a1  = s["model_ai1"]["rmse"]
        best_base = min(n1, n2, a1)
        beat = "YES" if bl < best_base else "NO "
        print(f"{rec['date']:<12} {rec['variable']:<6} {rec['lead_time_hours']:>5}   {bl:>8.4f}  {n1:>8.4f}  {n2:>8.4f}  {a1:>8.4f}  {beat}")
    print("=" * 75)


if __name__ == "__main__":
    run_all_inference()
