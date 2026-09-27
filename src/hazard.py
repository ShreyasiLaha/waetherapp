"""
RituGrid — IMD Hazard Detection Engine
src/hazard.py

Implements IMD-standard thresholds for three hazard types across
the blended forecast grids. Produces structured alert records
matching Schema.md §6 /extreme-guidance response format.

Rules.md §3 compliance: Does NOT smooth or cap extreme values —
detection is purely read-only from blended_2d arrays.
"""
import numpy as np
import pandas as pd
from src.config import TARGET_LATS, TARGET_LONS, SOURCE_MODELS, LEAD_TIMES

# ─── IMD Threshold Registry ───────────────────────────────────────────────────
# Reference: IMD Colour-Coded Warning System (2022), NCMRWF Operational Guide
HAZARD_THRESHOLDS = {
    "tp": {
        "type":      "heavy_rainfall",
        "threshold": 64.5,       # mm/day — IMD "Heavy Rain" (Yellow/Orange)
        "unit":      "mm/day",
        "threshold_str": ">= 64.5 mm/day",
    },
    "t2m": {
        "type":      "heatwave",
        "threshold": 313.15,     # Kelvin = 40.0°C — IMD Heatwave baseline
        "unit":      "K",
        "threshold_str": ">= 40.0 deg C (313.15 K)",
    },
    "ws10": {
        "type":      "high_wind",
        "threshold": 13.89,      # m/s = 50.0 km/h — IMD Gale/High Wind warning
        "unit":      "m/s",
        "threshold_str": ">= 50.0 km/h (13.89 m/s)",
    },
}

# Simple lat/lon to approximate Indian region label
# Covers the 5–35°N, 65–100°E bounding box
REGION_MAP = [
    # (lat_min, lat_max, lon_min, lon_max, label)
    (8,  13, 76, 82, "Tamil Nadu & Sri Lanka Coast"),
    (8,  16, 72, 77, "Kerala & Lakshadweep"),
    (15, 22, 72, 76, "Konkan & Goa"),
    (15, 25, 68, 74, "Gujarat Coast"),
    (20, 28, 86, 92, "Odisha & West Bengal"),
    (22, 28, 88, 92, "Bay of Bengal (North)"),
    (8,  20, 80, 86, "Andhra Pradesh & Telangana"),
    (18, 26, 73, 80, "Madhya Pradesh & Vidarbha"),
    (25, 32, 73, 80, "Rajasthan & Haryana"),
    (27, 35, 72, 80, "Northwest India (Punjab/HP)"),
    (25, 34, 86, 95, "Northeast India & Assam"),
    (6,  14, 92, 100,"Andaman & Nicobar"),
]


def lat_lon_to_region(lat: float, lon: float) -> str:
    """Map a grid-cell centroid to the nearest named Indian sub-region."""
    for lat_min, lat_max, lon_min, lon_max, label in REGION_MAP:
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return label
    return "Indian Subcontinent"


def detect_imd_hazards(
    date_str: str,
    blend_results: dict,   # {var_name: {lt: 2d_array (lat x lon)}}
    weight_results: dict,  # {var_name: {lt: {model_id: 2d_array}}}
) -> list[dict]:
    """
    Scan all blended forecast grids for IMD-threshold exceedances.
    Returns a list of alert dicts matching Schema.md §6 /extreme-guidance.
    """
    alerts = []
    n_lat, n_lon = len(TARGET_LATS), len(TARGET_LONS)
    lat_grid, lon_grid = np.meshgrid(TARGET_LATS, TARGET_LONS, indexing="ij")

    for var_name, info in HAZARD_THRESHOLDS.items():
        if var_name not in blend_results:
            continue
        for lt in LEAD_TIMES:
            blended_2d = blend_results[var_name].get(lt)
            w_grids    = weight_results.get(var_name, {}).get(lt, {})
            if blended_2d is None:
                continue

            extreme_mask = blended_2d >= info["threshold"]
            n_cells = int(extreme_mask.sum())
            if n_cells == 0:
                continue

            # Peak value
            peak_val = float(blended_2d[extreme_mask].max())

            # Centroid of extreme-cell cluster → region label
            lats_extreme = lat_grid[extreme_mask]
            lons_extreme = lon_grid[extreme_mask]
            centroid_lat = float(lats_extreme.mean())
            centroid_lon = float(lons_extreme.mean())
            region = lat_lon_to_region(centroid_lat, centroid_lon)

            # Dominant model in extreme cells (most weight on average)
            if w_grids:
                mean_weights = {
                    m: float(w_grids[m][extreme_mask].mean())
                    for m in SOURCE_MODELS if m in w_grids
                }
                dominant_model = max(mean_weights, key=mean_weights.get) if mean_weights else "unknown"
            else:
                dominant_model = "unknown"

            # Convert display values
            display_val = peak_val
            display_unit = info["unit"]
            if var_name == "t2m":
                display_val = round(peak_val - 273.15, 2)  # K → °C for display
                display_unit = "deg C"
            elif var_name == "ws10":
                display_val = round(peak_val * 3.6, 2)  # m/s → km/h for display
                display_unit = "km/h"

            alerts.append({
                "type":               info["type"],
                "variable":           var_name,
                "lead_time_hours":    lt,
                "threshold":          info["threshold_str"],
                "max_value":          round(display_val, 2),
                "max_value_unit":     display_unit,
                "region":             region,
                "centroid_lat":       round(centroid_lat, 2),
                "centroid_lon":       round(centroid_lon, 2),
                "affected_cells":     n_cells,
                "dominant_model_used": dominant_model,
            })

    return alerts
