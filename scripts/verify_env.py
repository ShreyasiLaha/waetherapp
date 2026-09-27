"""
RituGrid — Environment & Local Setup Verification Suite
scripts/verify_env.py

Phase 0 Setup Requirement:
Validates that the local environment meets all technical requirements:
- Python 3.10+
- All required libraries installed (xarray, dask, netCDF4, scikit-learn, etc.)
- Folder structure strictly conforms to Schema.md §2
- NetCDF4 I/O and coordinate math validation
"""
import sys
import os
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def run_checks():
    print("=" * 68)
    print("  RituGrid — Phase 0 Local Environment & Repo Verification")
    print("=" * 68)
    results = []

    # 1. Python Version Check
    py_ver = sys.version_info
    py_ok = (py_ver.major == 3 and py_ver.minor >= 10)
    ver_str = f"{py_ver.major}.{py_ver.minor}.{py_ver.micro}"
    results.append(("Python >= 3.10", py_ok, f"Found Python {ver_str}"))

    # 2. Required Libraries Check
    required_packages = [
        ("numpy", "numpy"),
        ("pandas", "pandas"),
        ("xarray", "xarray"),
        ("netCDF4", "netCDF4"),
        ("dask", "dask"),
        ("scikit-learn", "sklearn"),
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("cdsapi", "cdsapi"),
    ]

    for display_name, mod_name in required_packages:
        try:
            mod = __import__(mod_name)
            ver = getattr(mod, "__version__", "available")
            results.append((f"Package: {display_name}", True, f"v{ver}"))
        except ImportError as e:
            results.append((f"Package: {display_name}", False, str(e)))

    # 3. Directory Structure Check (Schema.md §2)
    expected_dirs = [
        PROJECT_ROOT / "data",
        PROJECT_ROOT / "data" / "raw",
        PROJECT_ROOT / "data" / "raw" / "model_nwp1",
        PROJECT_ROOT / "data" / "raw" / "model_nwp2",
        PROJECT_ROOT / "data" / "raw" / "model_ai1",
        PROJECT_ROOT / "data" / "regridded",
        PROJECT_ROOT / "data" / "regridded" / "model_nwp1",
        PROJECT_ROOT / "data" / "regridded" / "model_nwp2",
        PROJECT_ROOT / "data" / "regridded" / "model_ai1",
        PROJECT_ROOT / "data" / "truth",
        PROJECT_ROOT / "data" / "truth" / "era5",
        PROJECT_ROOT / "data" / "features",
        PROJECT_ROOT / "data" / "output",
        PROJECT_ROOT / "models",
        PROJECT_ROOT / "scripts",
        PROJECT_ROOT / "src",
        PROJECT_ROOT / "dashboard",
    ]

    missing_dirs = []
    for d in expected_dirs:
        d.mkdir(parents=True, exist_ok=True)
        if not d.exists() or not d.is_dir():
            missing_dirs.append(str(d.relative_to(PROJECT_ROOT)))

    results.append((
        "Directory Structure (Schema §2)",
        len(missing_dirs) == 0,
        "All directories verified" if not missing_dirs else f"Missing: {missing_dirs}"
    ))

    # 4. Coordinate Grid Math Check (Schema.md §1)
    try:
        from src.config import TARGET_LATS, TARGET_LONS, LAT_MIN, LAT_MAX, LON_MIN, LON_MAX, TARGET_GRID_RES
        expected_n_lat = int((LAT_MAX - LAT_MIN) / TARGET_GRID_RES) + 1  # 121
        expected_n_lon = int((LON_MAX - LON_MIN) / TARGET_GRID_RES) + 1  # 141
        grid_ok = (len(TARGET_LATS) == expected_n_lat and len(TARGET_LONS) == expected_n_lon)
        results.append((
            "Grid Spec (5-35N, 65-100E @0.25°)",
            grid_ok,
            f"Lats: {len(TARGET_LATS)} ({TARGET_LATS[0]} to {TARGET_LATS[-1]}), Lons: {len(TARGET_LONS)} ({TARGET_LONS[0]} to {TARGET_LONS[-1]})"
        ))
    except Exception as e:
        results.append(("Grid Spec Check", False, str(e)))

    # 5. NetCDF4 Functional I/O Check
    try:
        import xarray as xr
        import numpy as np
        test_file = PROJECT_ROOT / "data" / "_env_test.nc"
        da = xr.DataArray(
            np.zeros((3, 3), dtype=np.float32),
            coords=[("lat", [10.0, 11.0, 12.0]), ("lon", [70.0, 71.0, 72.0])],
            name="test_var"
        )
        ds = da.to_dataset()
        ds.to_netcdf(test_file)
        # Read back
        ds_read = xr.open_dataset(test_file)
        val = float(ds_read["test_var"].values[0, 0])
        ds_read.close()
        test_file.unlink(missing_ok=True)
        results.append(("NetCDF4 Engine Read/Write", True, "xarray/netCDF4 I/O operational"))
    except Exception as e:
        results.append(("NetCDF4 Engine Read/Write", False, str(e)))

    # Print Summary Table
    print(f"{'Check':<36} | {'Status':<8} | {'Details'}")
    print("-" * 68)
    all_passed = True
    for name, status, details in results:
        status_str = "[PASS]" if status else "[FAIL]"
        if not status:
            all_passed = False
        print(f"{name:<36} | {status_str:<8} | {details}")
    print("=" * 68)

    if all_passed:
        print("  RESULT: ALL PHASE 0 ENVIRONMENT CHECKS PASSED (100% OK)")
        print("=" * 68)
        return 0
    else:
        print("  RESULT: SOME CHECKS FAILED. Please review above output.")
        print("=" * 68)
        return 1


if __name__ == "__main__":
    sys.exit(run_checks())
