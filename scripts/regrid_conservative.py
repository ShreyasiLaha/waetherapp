"""
RituGrid Conservative Regridding Script
Batch regridding pipeline that converts all raw multi-model inputs
onto the common 0.25° x 0.25° grid using mass-conserving area-weighted remapping.
Follows Schema.md §2-3 and TRD.md §3.
"""
import sys
import argparse
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import xarray as xr
from src.config import (
    RAW_DATA_DIR,
    REGRIDDED_DATA_DIR,
    SOURCE_MODELS,
    VARIABLES,
    TARGET_LATS,
    TARGET_LONS,
)
from src.regridder import ConservativeRegridder


def regrid_all_models(dates: list = None):
    """
    Regrids raw model files in /data/raw/{source_model}/ to /data/regridded/{source_model}/
    """
    print("\n" + "=" * 60)
    print("STARTING CONSERVATIVE REGRIDDING PIPELINE")
    print("Enforcing physical mass & energy conservation (Rules.md §4)")
    print("=" * 60)

    # Cache regridder instances by source grid signature (src_lat_len, src_lon_len)
    regridder_cache = {}

    total_processed = 0

    for model_id in SOURCE_MODELS:
        src_dir = RAW_DATA_DIR / model_id
        tgt_dir = REGRIDDED_DATA_DIR / model_id
        tgt_dir.mkdir(parents=True, exist_ok=True)

        if not src_dir.exists():
            print(f"[Warning] Source directory {src_dir} not found. Skipping {model_id}.")
            continue

        raw_files = list(src_dir.glob("*.nc"))
        if dates is not None:
            raw_files = [f for f in raw_files if any(d in f.name for d in dates)]

        print(f"\nProcessing Model: {model_id} ({len(raw_files)} files found)")

        for fpath in raw_files:
            # Parse variable and date from filename: {var}_{YYYYMMDD}.nc
            stem = fpath.stem
            parts = stem.split("_")
            if len(parts) < 2:
                continue
            var_name = parts[0]
            date_str = parts[1]

            with xr.open_dataset(fpath) as ds:
                lat_name = "lat" if "lat" in ds.coords else "latitude"
                lon_name = "lon" if "lon" in ds.coords else "longitude"
                src_lats = ds[lat_name].values
                src_lons = ds[lon_name].values

                grid_sig = (len(src_lats), len(src_lons), src_lats[0], src_lons[0])
                if grid_sig not in regridder_cache:
                    regridder_cache[grid_sig] = ConservativeRegridder(src_lats, src_lons)
                regridder = regridder_cache[grid_sig]

                # Perform conservative remapping
                regridded_ds = regridder.regrid_dataset(ds)

                # Output path exactly per Schema.md §2
                out_path = tgt_dir / f"{var_name}_{date_str}.nc"
                regridded_ds.to_netcdf(out_path)
                total_processed += 1
                print(f"  [OK] [{model_id}] {fpath.name} -> {out_path.name} | target grid: {regridded_ds[var_name].shape}")

    print("\n" + "=" * 60)
    print(f"CONSERVATIVE REGRIDDING COMPLETE: {total_processed} files successfully remapped.")
    print(f"Target Grid: {len(TARGET_LATS)} Lats x {len(TARGET_LONS)} Lons (0.25° resolution)")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Conservative Regridding on Multi-Model Raw Data")
    parser.add_argument("--dates", nargs="+", default=None, help="Filter specific dates (YYYYMMDD)")
    args = parser.parse_args()
    regrid_all_models(args.dates)
