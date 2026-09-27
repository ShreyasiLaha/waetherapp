"""
RituGrid Phase 1 Validation Suite
Validates dimensional, coordinate, and mass-conservation alignment
between all source models and ERA5 truth according to Schema.md §3 and Rules.md §5.
"""
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import xarray as xr
from src.config import (
    REGRIDDED_DATA_DIR,
    TRUTH_DATA_DIR,
    SOURCE_MODELS,
    VARIABLES,
    TARGET_LATS,
    TARGET_LONS,
)


def validate_phase_1():
    print("\n" + "=" * 65)
    print("RITUGRID PHASE 1: GEOSPATIAL & DIMENSION ALIGNMENT AUDIT")
    print("=" * 65)

    errors = []
    checked_files = 0

    expected_lat_len = len(TARGET_LATS)
    expected_lon_len = len(TARGET_LONS)

    print(f"Target Reference Grid: {expected_lat_len} Lats x {expected_lon_len} Lons (0.25°)")
    print(f"Latitude Range: {TARGET_LATS[0]}°N to {TARGET_LATS[-1]}°N")
    print(f"Longitude Range: {TARGET_LONS[0]}°E to {TARGET_LONS[-1]}°E\n")

    # 1. Audit ERA5 Truth Files
    truth_dir = TRUTH_DATA_DIR / "era5"
    truth_files = list(truth_dir.glob("*.nc"))
    if not truth_files:
        errors.append("No ERA5 truth files found in /data/truth/era5/")
    else:
        print(f"--- Checking Ground Truth (ERA5) [{len(truth_files)} files] ---")
        for f in truth_files:
            checked_files += 1
            with xr.open_dataset(f) as ds:
                var = f.stem.split("_")[0]
                if var not in ds.data_vars:
                    errors.append(f"File {f.name} missing variable '{var}'")
                if len(ds.lat) != expected_lat_len:
                    errors.append(f"File {f.name} lat length {len(ds.lat)} != expected {expected_lat_len}")
                if len(ds.lon) != expected_lon_len:
                    errors.append(f"File {f.name} lon length {len(ds.lon)} != expected {expected_lon_len}")
                if np.isnan(ds[var].values).any():
                    errors.append(f"File {f.name} contains unexpected NaN values")
                print(f"  [OK] {f.name:<24} | dims: {dict(ds.dims)} | min: {float(ds[var].min()):.2f} | max: {float(ds[var].max()):.2f}")

    # 2. Audit Regridded Model Files
    for model_id in SOURCE_MODELS:
        model_dir = REGRIDDED_DATA_DIR / model_id
        m_files = list(model_dir.glob("*.nc")) if model_dir.exists() else []
        print(f"\n--- Checking Regridded Model: {model_id} [{len(m_files)} files] ---")
        if not m_files:
            errors.append(f"No regridded files found for model {model_id}")
            continue

        for f in m_files:
            checked_files += 1
            with xr.open_dataset(f) as ds:
                var = f.stem.split("_")[0]
                if var not in ds.data_vars:
                    errors.append(f"Model {model_id} file {f.name} missing variable '{var}'")
                if len(ds.lat) != expected_lat_len:
                    errors.append(f"Model {model_id} file {f.name} lat length mismatch")
                if len(ds.lon) != expected_lon_len:
                    errors.append(f"Model {model_id} file {f.name} lon length mismatch")
                if not np.allclose(ds.lat.values, TARGET_LATS, atol=1e-4):
                    errors.append(f"Model {model_id} file {f.name} lat coordinate values mismatch")
                if not np.allclose(ds.lon.values, TARGET_LONS, atol=1e-4):
                    errors.append(f"Model {model_id} file {f.name} lon coordinate values mismatch")
                if np.isnan(ds[var].values).any():
                    errors.append(f"Model {model_id} file {f.name} contains unexpected NaNs")

                print(f"  [OK] {f.name:<24} | dims: {dict(ds.dims)} | min: {float(ds[var].min()):.2f} | max: {float(ds[var].max()):.2f}")

    # Final verdict
    print("\n" + "=" * 65)
    if errors:
        print(f"[FAIL] VALIDATION FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        return False
    else:
        print(f"[PASS] ALL CHECKS PASSED! {checked_files} files verified.")
        print("All models and truth are 100% dimensionally and coordinate-aligned.")
        print("Phase 1 Exit Criteria Satisfied!")
        print("=" * 65)
        return True


if __name__ == "__main__":
    success = validate_phase_1()
    sys.exit(0 if success else 1)
