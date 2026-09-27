"""
RituGrid — Operational Blend Routine
scripts/run_operational_blend.py

Unattended pipeline entry-point (AppFlow.md §1, step 5).
Runs end-to-end: ingest → regrid → feature-build → blender → hazard-detect → export.
Can be called daily via cron / Windows Task Scheduler for live operation.

Usage:
  python scripts/run_operational_blend.py --date 20230715
  python scripts/run_operational_blend.py --date all          # reprocess every date
  python scripts/run_operational_blend.py                     # defaults to all available
"""
import sys
import json
import logging
import pickle
import argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
import xarray as xr

from src.config import (
    REGRIDDED_DATA_DIR, TRUTH_DATA_DIR, OUTPUT_DIR,
    MODELS_DIR, SOURCE_MODELS, VARIABLES, TARGET_LATS, TARGET_LONS, LEAD_TIMES,
)
from src.blending_model import FEATURE_COLS, fill_missing_models
from src.hazard import detect_imd_hazards, HAZARD_THRESHOLDS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(OUTPUT_DIR.parent / "operational.log", mode="a"),
    ]
)
log = logging.getLogger(__name__)


# ─── Model Registry ──────────────────────────────────────────────────────────

def load_models() -> dict:
    """Load all 3 trained blending models. Raises if any missing."""
    models = {}
    for var in VARIABLES:
        p = MODELS_DIR / f"blender_{var}_v1.pkl"
        if not p.exists():
            raise FileNotFoundError(
                f"Blending model not found: {p}. "
                "Run scripts/train_blender.py first."
            )
        with open(p, "rb") as f:
            models[var] = pickle.load(f)
        log.info("[LOADED] blender_%s_v1.pkl", var)
    return models


# ─── Single-Date Operational Pipeline ────────────────────────────────────────

def run_single_date(date_str: str, models: dict, disabled_models: list[str] | None = None) -> bool:
    """
    Complete operational blend for one date:
      1. Load regridded source models + ERA5 truth
      2. Build feature matrix
      3. Run blending inference → blended_*.nc
      4. Compute & persist weight maps → weights_*.nc
      5. Detect IMD extreme hazards → extreme_guidance_{date}.json
      6. Compute skill scores (vs truth if available) → appended to skill_scores.json

    disabled_models: list of model IDs to simulate outage (fallback demo).
    """
    disabled_models = disabled_models or []
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    dt = pd.Timestamp(date_str)
    doy = dt.day_of_year
    n_lat, n_lon = len(TARGET_LATS), len(TARGET_LONS)
    n_cells = n_lat * n_lon
    lat_grid, lon_grid = np.meshgrid(TARGET_LATS, TARGET_LONS, indexing="ij")

    log.info("=" * 65)
    log.info("OPERATIONAL BLEND | date=%s | disabled=%s", date_str, disabled_models or "none")
    log.info("=" * 65)

    all_blend_results = {}   # {var: {lt: 2d_array}}
    all_weight_results = {}  # {var: {lt: {model_id: 2d_array}}}
    all_skill_records  = []

    for var_name in VARIABLES:
        pipeline = models[var_name]
        all_blend_results[var_name] = {}
        all_weight_results[var_name] = {}

        # Load truth (may be absent in real-time mode)
        truth_path = TRUTH_DATA_DIR / "era5" / f"{var_name}_{date_str}.nc"
        truth_arr = None
        if truth_path.exists():
            with xr.open_dataset(truth_path) as ds:
                truth_arr = ds[var_name].values[0].astype(np.float32)

        # Load source model arrays (with outage simulation)
        model_arrays = {}
        for model_id in SOURCE_MODELS:
            if model_id in disabled_models:
                model_arrays[model_id] = None
                log.warning("  [OUTAGE] %s disabled — fallback redistribution active.", model_id)
                continue
            p = REGRIDDED_DATA_DIR / model_id / f"{var_name}_{date_str}.nc"
            if p.exists():
                with xr.open_dataset(p) as ds:
                    model_arrays[model_id] = ds[var_name].values[0].astype(np.float32)
            else:
                model_arrays[model_id] = None
                log.warning("  [MISSING] %s/%s_%s.nc — fallback active.", model_id, var_name, date_str)

        for lt in LEAD_TIMES:
            lt_decay = 1.0 - 0.02 * (lt / 24 - 1)

            nwp1 = (model_arrays["model_nwp1"] * lt_decay).ravel() if model_arrays["model_nwp1"] is not None else np.full(n_cells, np.nan)
            nwp2 = (model_arrays["model_nwp2"] * lt_decay).ravel() if model_arrays["model_nwp2"] is not None else np.full(n_cells, np.nan)
            ai1  = (model_arrays["model_ai1"] * (lt_decay ** 1.5)).ravel() if model_arrays["model_ai1"] is not None else np.full(n_cells, np.nan)

            cross_var = np.nanvar(np.stack([nwp1, nwp2, ai1], axis=1), axis=1).astype(np.float32)

            X_df = pd.DataFrame({
                "model_nwp1_value":    nwp1,
                "model_nwp2_value":    nwp2,
                "model_ai1_value":     ai1,
                "cross_model_variance": cross_var,
                "day_of_year":         np.full(n_cells, doy),
                "lead_time_hours":     np.full(n_cells, lt),
                "lat":                 lat_grid.ravel(),
                "lon":                 lon_grid.ravel(),
            })
            X_df = fill_missing_models(X_df)

            # Blended forecast
            blended_flat = pipeline.predict(X_df[FEATURE_COLS].values).astype(np.float32)
            if var_name in ("tp", "ws10"):
                blended_flat = np.clip(blended_flat, 0.0, None)
            blended_2d = blended_flat.reshape(n_lat, n_lon)
            all_blend_results[var_name][lt] = blended_2d

            # Weight maps — fast coarse-grid attribution + block-fill
            step = 4
            w_grids = {m: np.zeros((n_lat, n_lon), dtype=np.float32) for m in SOURCE_MODELS}
            X_arr = X_df[FEATURE_COLS].values
            for i in range(0, n_lat, step):
                for j in range(0, n_lon, step):
                    idx = i * n_lon + j
                    base_pred = pipeline.predict(X_arr[idx:idx+1])[0]
                    contribs = {}
                    for mid, col in zip(SOURCE_MODELS, ["model_nwp1_value", "model_nwp2_value", "model_ai1_value"]):
                        pert = X_arr[idx:idx+1].copy()
                        pert[0, FEATURE_COLS.index(col)] = 0.0
                        pert_pred = pipeline.predict(pert)[0]
                        contribs[mid] = abs(base_pred - pert_pred)
                    total = sum(contribs.values()) or 1e-9
                    # Disabled models get weight=0, remaining renormalized
                    for mid in disabled_models:
                        contribs[mid] = 0.0
                    active_total = sum(contribs.values()) or 1e-9
                    ie, je = min(i+step, n_lat), min(j+step, n_lon)
                    for mid in SOURCE_MODELS:
                        w_grids[mid][i:ie, j:je] = contribs[mid] / active_total
            all_weight_results[var_name][lt] = w_grids

            # Write blended NetCDF
            out_blend = OUTPUT_DIR / f"blended_{var_name}_{date_str}_lt{lt}h.nc"
            xr.Dataset(
                {var_name: (["time","lat","lon"], blended_2d[np.newaxis,...])},
                coords={"time": [dt.to_pydatetime()], "lat": TARGET_LATS, "lon": TARGET_LONS},
                attrs={"source":"RituGrid Operational Blender","lead_time_hours":lt,"variable":var_name,
                       "disabled_models": str(disabled_models)}
            ).to_netcdf(out_blend)

            # Write weight NetCDF
            out_wt = OUTPUT_DIR / f"weights_{var_name}_{date_str}_lt{lt}h.nc"
            xr.Dataset(
                {f"weight_{m}": (["time","lat","lon"], w_grids[m][np.newaxis,...]) for m in SOURCE_MODELS},
                coords={"time": [dt.to_pydatetime()], "lat": TARGET_LATS, "lon": TARGET_LONS},
                attrs={"lead_time_hours":lt,"variable":var_name}
            ).to_netcdf(out_wt)

            # Skill scores (if truth available)
            if truth_arr is not None:
                mask = ~(np.isnan(blended_2d) | np.isnan(truth_arr))
                rmse_bl = float(np.sqrt(np.mean((blended_2d[mask]-truth_arr[mask])**2))) if mask.sum() else float("nan")
                clim = float(np.nanmean(truth_arr))
                def acc(p): 
                    pa, ta = (p-clim)[mask], (truth_arr-clim)[mask]
                    return float(np.corrcoef(pa, ta)[0,1]) if np.std(pa)*np.std(ta)>1e-12 else 0.0
                scores = {"blended": {"rmse": round(rmse_bl,4), "acc": round(acc(blended_2d),4)}}
                for mid, raw in zip(SOURCE_MODELS, [nwp1, nwp2, ai1]):
                    raw2d = raw.reshape(n_lat,n_lon)
                    m2 = ~(np.isnan(raw2d)|np.isnan(truth_arr))
                    r = float(np.sqrt(np.mean((raw2d[m2]-truth_arr[m2])**2))) if m2.sum() else float("nan")
                    scores[mid] = {"rmse": round(r,4), "acc": round(acc(raw2d),4)}
                all_skill_records.append({"date":date_str,"variable":var_name,"lead_time_hours":lt,"scores":scores})
                log.info("  [SKILL] %s | %s | lt+%dh → Blended RMSE=%.4f ACC=%.4f", date_str, var_name, lt, rmse_bl, scores["blended"]["acc"])

    # ── Hazard detection → extreme_guidance_{date}.json ──────────────────────
    hazard_alerts = detect_imd_hazards(date_str, all_blend_results, all_weight_results)
    out_guide = OUTPUT_DIR / f"extreme_guidance_{date_str}.json"
    with open(out_guide, "w") as f:
        json.dump({"date": date_str, "alerts": hazard_alerts}, f, indent=2)
    log.info("[HAZARD] %d IMD alerts written → %s", len(hazard_alerts), out_guide.name)

    # ── Update skill_scores.json ──────────────────────────────────────────────
    skill_path = OUTPUT_DIR / "skill_scores.json"
    existing = []
    if skill_path.exists():
        with open(skill_path) as f:
            existing = json.load(f)
    # Replace records for this date (upsert)
    existing_keys = {(r["date"], r["variable"], r["lead_time_hours"]) for r in existing}
    existing = [r for r in existing if (r["date"],r["variable"],r["lead_time_hours"]) not in
                {(n["date"],n["variable"],n["lead_time_hours"]) for n in all_skill_records}]
    existing.extend(all_skill_records)
    with open(skill_path, "w") as f:
        json.dump(existing, f, indent=2)
    log.info("[SKILL] skill_scores.json updated — total %d records.", len(existing))
    return True


# ─── CLI Entry Point ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="RituGrid Operational Blend Pipeline")
    parser.add_argument("--date", default="all",
                        help="Date in YYYYMMDD format, or 'all' to process every available date.")
    parser.add_argument("--disable", nargs="*", default=[],
                        help="Simulate model outage: e.g. --disable model_ai1")
    args = parser.parse_args()

    models = load_models()

    if args.date == "all":
        dates = sorted(set(
            f.stem.split("_")[1]
            for f in (TRUTH_DATA_DIR / "era5").glob("*.nc")
        ))
        if not dates:
            log.error("No truth dates found. Run procure_data.py first.")
            sys.exit(1)
    else:
        dates = [args.date]

    log.info("Processing %d date(s): %s", len(dates), dates)
    for date_str in dates:
        run_single_date(date_str, models, disabled_models=args.disable)

    log.info("Operational blend complete.")


if __name__ == "__main__":
    main()
