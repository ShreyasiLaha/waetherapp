"""
RituGrid Phase 2 — Feature Engineering Pipeline
Builds features.parquet from regridded multi-model NetCDF files.
Schema exactly matches Schema.md §4 — do not add or rename columns.

Columns:
  lat, lon, date, lead_time_hours,
  model_nwp1_value, model_nwp2_value, model_ai1_value,
  cross_model_variance, day_of_year, truth_value
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import logging
import numpy as np
import pandas as pd
import xarray as xr

from src.config import (
    REGRIDDED_DATA_DIR,
    TRUTH_DATA_DIR,
    FEATURES_DIR,
    SOURCE_MODELS,
    VARIABLES,
    TARGET_LATS,
    TARGET_LONS,
    LEAD_TIMES,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def load_nc_value(nc_path: Path, var_name: str) -> np.ndarray | None:
    """Load 2D (lat, lon) slice from a NetCDF file. Returns None if missing."""
    if not nc_path.exists():
        return None
    with xr.open_dataset(nc_path) as ds:
        if var_name not in ds:
            return None
        arr = ds[var_name].values  # shape: (1, lat, lon) or (lat, lon)
        if arr.ndim == 3:
            arr = arr[0]
        return arr.astype(np.float32)


def detect_season(doy: int) -> str:
    """Map day-of-year to Indian meteorological season."""
    if doy < 60:
        return "winter"
    elif doy < 122:
        return "pre_monsoon"
    elif doy < 275:
        return "monsoon"
    else:
        return "post_monsoon"


def build_features_for_date(date_str: str, var_name: str) -> pd.DataFrame | None:
    """
    Builds one flat feature table for a specific date and variable.
    Lead time is synthetic (scaled noise) since real multi-lead files share same date key.
    """
    truth_path = TRUTH_DATA_DIR / "era5" / f"{var_name}_{date_str}.nc"
    truth_arr = load_nc_value(truth_path, var_name)
    if truth_arr is None:
        log.warning("Missing ERA5 truth for %s %s, skipping.", var_name, date_str)
        return None

    # Load each source model
    model_arrays = {}
    for model_id in SOURCE_MODELS:
        nc_path = REGRIDDED_DATA_DIR / model_id / f"{var_name}_{date_str}.nc"
        arr = load_nc_value(nc_path, var_name)
        model_arrays[model_id] = arr  # may be None if model missing (fallback scenario)

    dt = pd.Timestamp(date_str)
    doy = dt.day_of_year

    rows = []
    n_lat = len(TARGET_LATS)
    n_lon = len(TARGET_LONS)

    for lt in LEAD_TIMES:
        # Lead-time decay: AI models degrade faster at longer lead times for precip
        # NWP models maintain skill better (slight advantage at Day 5)
        lt_decay = 1.0 - 0.02 * (lt / 24 - 1)  # tiny decay factor for realism

        for i, lat in enumerate(TARGET_LATS):
            for j, lon in enumerate(TARGET_LONS):
                truth_val = float(truth_arr[i, j])

                # Collect model values; NaN for missing models (fallback testing)
                nwp1_val = float(model_arrays["model_nwp1"][i, j]) * lt_decay if model_arrays["model_nwp1"] is not None else np.nan
                nwp2_val = float(model_arrays["model_nwp2"][i, j]) * lt_decay if model_arrays["model_nwp2"] is not None else np.nan
                ai1_val  = float(model_arrays["model_ai1"][i, j]) * (lt_decay ** 1.5) if model_arrays["model_ai1"] is not None else np.nan

                # Cross-model variance: key "disagreement" feature (Schema.md §4)
                valid_vals = [v for v in [nwp1_val, nwp2_val, ai1_val] if not np.isnan(v)]
                cross_var = float(np.var(valid_vals)) if len(valid_vals) > 1 else 0.0

                rows.append({
                    "lat":                lat,
                    "lon":                lon,
                    "date":               dt,
                    "lead_time_hours":    lt,
                    "model_nwp1_value":   np.float32(nwp1_val),
                    "model_nwp2_value":   np.float32(nwp2_val),
                    "model_ai1_value":    np.float32(ai1_val),
                    "cross_model_variance": np.float32(cross_var),
                    "day_of_year":        int(doy),
                    "truth_value":        np.float32(truth_val),
                })

    return pd.DataFrame(rows)


def build_features_all(var_name: str) -> None:
    """Build and save features.parquet for a given variable."""
    FEATURES_DIR.mkdir(parents=True, exist_ok=True)

    truth_dir = TRUTH_DATA_DIR / "era5"
    available_dates = sorted([
        f.stem.split("_")[1]
        for f in truth_dir.glob(f"{var_name}_*.nc")
    ])

    if not available_dates:
        log.error("No truth files found for variable '%s'.", var_name)
        return

    log.info("Building features for variable '%s' across %d dates...", var_name, len(available_dates))
    all_dfs = []
    for d in available_dates:
        log.info("  Processing date %s ...", d)
        df = build_features_for_date(d, var_name)
        if df is not None:
            all_dfs.append(df)

    if not all_dfs:
        log.error("No data collected for variable '%s'.", var_name)
        return

    combined = pd.concat(all_dfs, ignore_index=True)

    # Enforce Schema.md §4 dtypes
    combined["lat"]   = combined["lat"].astype("float32")
    combined["lon"]   = combined["lon"].astype("float32")
    combined["date"]  = pd.to_datetime(combined["date"])
    combined["lead_time_hours"]     = combined["lead_time_hours"].astype("int32")
    combined["day_of_year"]         = combined["day_of_year"].astype("int32")
    combined["model_nwp1_value"]    = combined["model_nwp1_value"].astype("float32")
    combined["model_nwp2_value"]    = combined["model_nwp2_value"].astype("float32")
    combined["model_ai1_value"]     = combined["model_ai1_value"].astype("float32")
    combined["cross_model_variance"]= combined["cross_model_variance"].astype("float32")
    combined["truth_value"]         = combined["truth_value"].astype("float32")

    out_path = FEATURES_DIR / f"features_{var_name}.parquet"
    combined.to_parquet(out_path, index=False)
    log.info("[OK] Saved: %s | rows=%d | cols=%s", out_path.name, len(combined), list(combined.columns))


if __name__ == "__main__":
    for var in VARIABLES:
        build_features_all(var)
    log.info("Feature engineering complete for all variables.")
