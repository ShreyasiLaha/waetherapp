"""
RituGrid Configuration Module
Single source of truth for coordinates, variables, paths, and constants.
Strictly conforms to Schema.md and TRD.md.
"""
from pathlib import Path
import numpy as np

# Project Root Directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Data Directories
DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
REGRIDDED_DATA_DIR = DATA_DIR / "regridded"
TRUTH_DATA_DIR = DATA_DIR / "truth"
FEATURES_DIR = DATA_DIR / "features"
OUTPUT_DIR = DATA_DIR / "output"
MODELS_DIR = PROJECT_ROOT / "models"

# Spatial Bounding Box (Indian Subcontinent)
LAT_MIN = 5.0
LAT_MAX = 35.0
LON_MIN = 65.0
LON_MAX = 100.0
TARGET_GRID_RES = 0.25  # degrees (~27 km at equator)

# Coords Arrays
TARGET_LATS = np.round(np.arange(LAT_MIN, LAT_MAX + TARGET_GRID_RES, TARGET_GRID_RES), 2)
TARGET_LONS = np.round(np.arange(LON_MIN, LON_MAX + TARGET_GRID_RES, TARGET_GRID_RES), 2)

# Forecast Horizons (hours)
LEAD_TIMES = [24, 48, 72, 120]  # Day 1, Day 2, Day 3, Day 5

# Target Variables
VARIABLES = {
    "tp": {
        "long_name": "Total Precipitation (24hr accumulated)",
        "units": "mm",
        "extreme_threshold": 64.5,  # IMD Heavy Rainfall threshold
    },
    "t2m": {
        "long_name": "2-Metre Temperature",
        "units": "Kelvin",
        "extreme_threshold": 313.15,  # 40°C in Kelvin (IMD Heatwave baseline)
    },
    "ws10": {
        "long_name": "10-Metre Wind Speed",
        "units": "m/s",
        "extreme_threshold": 13.89,  # 50 km/h in m/s (IMD High Wind threshold)
    }
}

# Model Identifiers
SOURCE_MODELS = ["model_nwp1", "model_nwp2", "model_ai1"]
MODEL_DESCRIPTIONS = {
    "model_nwp1": "NOAA GFS (NWP Proxy for NCUM)",
    "model_nwp2": "GEFS / TIGGE Ensemble (Proxy for NEPS)",
    "model_ai1": "GraphCast / Pangu-Weather (AI Weather Model)",
}
TRUTH_SOURCE = "era5"
