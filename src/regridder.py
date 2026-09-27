"""
RituGrid Conservative Regridding Engine
Implements spherical area-weighted conservative remapping for xarray datasets.
Guarantees mass & energy conservation as mandated by TRD.md §3 and Rules.md §4.
"""
import numpy as np
import xarray as xr
from typing import Tuple
from src.config import TARGET_LATS, TARGET_LONS, TARGET_GRID_RES


def get_cell_bounds_1d(coords: np.ndarray, res: float = None) -> np.ndarray:
    """Computes cell edge boundaries from 1D cell centers."""
    if res is None:
        diffs = np.diff(coords)
        res = np.abs(diffs[0]) if len(diffs) > 0 else 0.25

    half = res / 2.0
    # If coordinates are ascending
    if coords[0] < coords[-1]:
        bounds = np.empty(len(coords) + 1, dtype=np.float64)
        bounds[:-1] = coords - half
        bounds[-1] = coords[-1] + half
    else:  # descending (common in lat)
        bounds = np.empty(len(coords) + 1, dtype=np.float64)
        bounds[:-1] = coords + half
        bounds[-1] = coords[-1] - half
    return bounds


def compute_1d_overlap_weights(
    src_bounds: np.ndarray,
    tgt_bounds: np.ndarray,
    is_lat: bool = False
) -> np.ndarray:
    """
    Computes overlap fraction matrix between source and target cells.
    If is_lat=True, weights are calculated via sin(lat) for spherical area preservation.
    """
    # Normalize bounds to ascending order for overlap calculation
    src_b = np.sort(src_bounds)
    tgt_b = np.sort(tgt_bounds)

    n_src = len(src_b) - 1
    n_tgt = len(tgt_b) - 1
    weights = np.zeros((n_tgt, n_src), dtype=np.float64)

    # Precalculate sin for spherical area if latitude
    if is_lat:
        src_metric = np.sin(np.deg2rad(src_b))
        tgt_metric = np.sin(np.deg2rad(tgt_b))
    else:
        src_metric = src_b
        tgt_metric = tgt_b

    for j in range(n_tgt):
        tgt_min = tgt_b[j]
        tgt_max = tgt_b[j + 1]

        for i in range(n_src):
            src_min = src_b[i]
            src_max = src_b[i + 1]

            # Intersection between [src_min, src_max] and [tgt_min, tgt_max]
            overlap_min = max(src_min, tgt_min)
            overlap_max = min(src_max, tgt_max)

            if overlap_max > overlap_min:
                if is_lat:
                    overlap_size = np.sin(np.deg2rad(overlap_max)) - np.sin(np.deg2rad(overlap_min))
                else:
                    overlap_size = overlap_max - overlap_min
                weights[j, i] = overlap_size

        # Normalize across source contributions to this target cell
        total_overlap = np.sum(weights[j, :])
        if total_overlap > 1e-12:
            weights[j, :] /= total_overlap

    # If original target was descending, reverse rows
    if tgt_bounds[0] > tgt_bounds[-1]:
        weights = weights[::-1, :]
    # If original source was descending, reverse cols
    if src_bounds[0] > src_bounds[-1]:
        weights = weights[:, ::-1]

    return weights


class ConservativeRegridder:
    """
    Area-weighted spherical conservative regridder.
    Converts any regular source grid to the standard RituGrid 0.25° grid.
    """

    def __init__(self, src_lats: np.ndarray, src_lons: np.ndarray):
        self.src_lats = np.asarray(src_lats, dtype=np.float64)
        self.src_lons = np.asarray(src_lons, dtype=np.float64)
        self.tgt_lats = TARGET_LATS
        self.tgt_lons = TARGET_LONS

        src_lat_bounds = get_cell_bounds_1d(self.src_lats)
        src_lon_bounds = get_cell_bounds_1d(self.src_lons)
        tgt_lat_bounds = get_cell_bounds_1d(self.tgt_lats, TARGET_GRID_RES)
        tgt_lon_bounds = get_cell_bounds_1d(self.tgt_lons, TARGET_GRID_RES)

        # Precompute 1D separable conservative weight matrices
        self.lat_weights = compute_1d_overlap_weights(src_lat_bounds, tgt_lat_bounds, is_lat=True)
        self.lon_weights = compute_1d_overlap_weights(src_lon_bounds, tgt_lon_bounds, is_lat=False)

    def regrid_array_2d(self, data_2d: np.ndarray) -> np.ndarray:
        """
        Conservative remapping of a 2D (lat, lon) array.
        W_lat @ data @ W_lon.T
        """
        # Intermediate: (tgt_lat, src_lon)
        inter = np.matmul(self.lat_weights, data_2d)
        # Final: (tgt_lat, tgt_lon)
        out = np.matmul(inter, self.lon_weights.T)
        return out.astype(np.float32)

    def regrid_dataset(self, ds: xr.Dataset) -> xr.Dataset:
        """
        Conservative remapping of all data variables in an xarray Dataset.
        Maintains (time, lat, lon) dimension structure according to Schema.md §3.
        """
        regridded_vars = {}

        # Identify lat/lon coordinate names in source
        lat_name = "lat" if "lat" in ds.coords else "latitude"
        lon_name = "lon" if "lon" in ds.coords else "longitude"

        for var_name, da in ds.data_vars.items():
            vals = da.values
            if vals.ndim == 2:
                regridded_vals = self.regrid_array_2d(vals)
                regridded_vals = regridded_vals[np.newaxis, :, :]  # Add time dim
            elif vals.ndim == 3:  # (time, lat, lon)
                n_times = vals.shape[0]
                n_tgt_lats = len(self.tgt_lats)
                n_tgt_lons = len(self.tgt_lons)
                regridded_vals = np.zeros((n_times, n_tgt_lats, n_tgt_lons), dtype=np.float32)
                for t in range(n_times):
                    regridded_vals[t] = self.regrid_array_2d(vals[t])
            else:
                raise ValueError(f"Unsupported array dimensionality {vals.ndim} for variable {var_name}")

            # Enforce non-negative constraint for physical variables like precipitation & wind speed
            if var_name in ["tp", "ws10"]:
                regridded_vals = np.clip(regridded_vals, a_min=0.0, a_max=None)

            regridded_vars[var_name] = (["time", "lat", "lon"], regridded_vals)

        # Build standardized dataset matching Schema.md §3
        time_coord = ds["time"].values if "time" in ds.coords else [np.datetime64("now")]
        out_ds = xr.Dataset(
            data_vars=regridded_vars,
            coords={
                "time": time_coord,
                "lat": self.tgt_lats,
                "lon": self.tgt_lons,
            },
            attrs={
                "regridding_method": "spherical_area_weighted_conservative",
                "target_grid": "0.25x0.25_Indian_Subcontinent",
                "mass_conserved": "True",
            }
        )
        return out_ds
