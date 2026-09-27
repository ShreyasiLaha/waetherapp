"""
RituGrid — FastAPI Backend Serving Layer
src/api.py

Implements ALL endpoints defined in Schema.md §6.
No unlisted endpoints added. Read-only — all data served from pre-computed files.

Endpoints:
  GET  /dates
  GET  /forecast
  GET  /weights
  GET  /skill-scores
  GET  /extreme-guidance
  POST /simulate-dropout

Run server:
  uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload

Or use the launcher:
  python scripts/serve_api.py
"""
import json
import logging
import pickle
import subprocess
from pathlib import Path
from typing import Optional

import numpy as np
import xarray as xr
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

# Bootstrap sys.path for src imports when run as module
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import (
    PROJECT_ROOT, OUTPUT_DIR, MODELS_DIR, REGRIDDED_DATA_DIR, TRUTH_DATA_DIR,
    SOURCE_MODELS, VARIABLES, TARGET_LATS, TARGET_LONS, LEAD_TIMES,
)
from src.blending_model import FEATURE_COLS, fill_missing_models
from src.hazard import detect_imd_hazards

log = logging.getLogger("ritugrid.api")

app = FastAPI(
    title="RituGrid API",
    description="Hybrid AI–NWP Multi-Model Forecast Blending System — MoES/NCMRWF SIH 2026",
    version="1.0.0",
)

# Allow all origins for dashboard development (tighten in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Mount static dashboard UI
DASHBOARD_DIR = PROJECT_ROOT / "dashboard"
if DASHBOARD_DIR.exists():
    app.mount("/dashboard", StaticFiles(directory=str(DASHBOARD_DIR), html=True), name="dashboard")

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/dashboard/landing.html")



# ─── Internal Helpers ─────────────────────────────────────────────────────────

def _nc_to_grid(nc_path: Path, var_name: str) -> dict:
    """Read NetCDF and return lat, lon, values as JSON-serialisable dict."""
    if not nc_path.exists():
        return None
    with xr.open_dataset(nc_path) as ds:
        arr = ds[var_name].values[0].astype(float)  # (lat, lon)
        # Replace NaN with None for JSON compliance
        arr = np.where(np.isnan(arr), None, arr)
    return {
        "lat":    TARGET_LATS.tolist(),
        "lon":    TARGET_LONS.tolist(),
        "values": arr.tolist(),
    }


def _available_dates() -> list[str]:
    """Scan output directory for dates that have at least one blended file."""
    dates = set()
    for f in OUTPUT_DIR.glob("blended_*.nc"):
        parts = f.stem.split("_")
        if len(parts) >= 3:
            dates.add(parts[2])  # blended_{var}_{date}_lt{lt}h
    return sorted(dates)


def _load_skill_scores() -> list[dict]:
    p = OUTPUT_DIR / "skill_scores.json"
    if not p.exists():
        return []
    with open(p) as f:
        return json.load(f)


def _validate_params(date: str, lead_time: int, variable: str):
    """Raise HTTP 422 for unknown param values before touching disk."""
    valid_dates = _available_dates()
    if not valid_dates:
        raise HTTPException(503, "No blended outputs found. Run run_operational_blend.py first.")
    if date not in valid_dates:
        raise HTTPException(404, f"Date '{date}' not available. Available: {valid_dates}")
    if lead_time not in LEAD_TIMES:
        raise HTTPException(422, f"lead_time must be one of {LEAD_TIMES}")
    if variable not in VARIABLES:
        raise HTTPException(422, f"variable must be one of {list(VARIABLES.keys())}")


# ─── GET /dates ───────────────────────────────────────────────────────────────

@app.get("/dates", summary="List all available forecast dates")
def get_dates():
    """
    Returns all dates for which blended forecast outputs exist on disk.
    Dashboard uses this to populate the date picker (AppFlow.md §2).
    Dates outside this list are disabled in the UI — no invalid requests possible.
    """
    dates = _available_dates()
    if not dates:
        raise HTTPException(503, "No blended outputs available. Run the operational pipeline first.")
    # Convert YYYYMMDD → ISO YYYY-MM-DD for display
    iso_dates = [f"{d[:4]}-{d[4:6]}-{d[6:]}" for d in dates]
    return {"available_dates": iso_dates, "raw_dates": dates}


# ─── GET /forecast ────────────────────────────────────────────────────────────

@app.get("/forecast", summary="Blended forecast grid for date/lead_time/variable")
def get_forecast(
    date: str = Query(..., example="20230715"),
    lead_time: int = Query(..., example=48),
    variable: str = Query(..., example="tp"),
):
    """
    Returns the blended forecast grid (lat × lon) for the requested params.
    Schema.md §6 /forecast response.
    """
    _validate_params(date, lead_time, variable)
    nc_path = OUTPUT_DIR / f"blended_{variable}_{date}_lt{lead_time}h.nc"
    grid = _nc_to_grid(nc_path, variable)
    if grid is None:
        raise HTTPException(404, f"blended_{variable}_{date}_lt{lead_time}h.nc not found.")
    return {
        "date":            f"{date[:4]}-{date[4:6]}-{date[6:]}",
        "lead_time_hours": lead_time,
        "variable":        variable,
        "units":           VARIABLES[variable]["units"],
        "grid":            grid,
    }


# ─── GET /weights ─────────────────────────────────────────────────────────────

@app.get("/weights", summary="Per-model weight maps for date/lead_time/variable")
def get_weights(
    date: str = Query(..., example="20230715"),
    lead_time: int = Query(..., example=48),
    variable: str = Query(..., example="tp"),
):
    """
    Returns per-model weight grids + dominant-model grid.
    Schema.md §6 /weights response.
    """
    _validate_params(date, lead_time, variable)
    nc_path = OUTPUT_DIR / f"weights_{variable}_{date}_lt{lead_time}h.nc"
    if not nc_path.exists():
        raise HTTPException(404, f"weights_{variable}_{date}_lt{lead_time}h.nc not found.")

    with xr.open_dataset(nc_path) as ds:
        weight_arrs = {}
        for m in SOURCE_MODELS:
            weight_arrs[m] = ds[f"weight_{m}"].values[0].astype(float)

    # Dominant model grid
    stacked = np.stack([weight_arrs[m] for m in SOURCE_MODELS], axis=0)  # (3, lat, lon)
    dominant_idx = np.argmax(stacked, axis=0)                              # (lat, lon)
    source_arr = np.array(SOURCE_MODELS)
    dominant_grid = source_arr[dominant_idx].tolist()

    return {
        "date":            f"{date[:4]}-{date[4:6]}-{date[6:]}",
        "lead_time_hours": lead_time,
        "variable":        variable,
        "models":          SOURCE_MODELS,
        "grid": {
            "lat":             TARGET_LATS.tolist(),
            "lon":             TARGET_LONS.tolist(),
            "dominant_model":  dominant_grid,
            "weights": {
                m: np.where(np.isnan(weight_arrs[m]), None, weight_arrs[m]).tolist()
                for m in SOURCE_MODELS
            },
        },
    }


# ─── GET /skill-scores ────────────────────────────────────────────────────────

@app.get("/skill-scores", summary="RMSE & ACC for blended + individual models")
def get_skill_scores(
    date: Optional[str]  = Query(None, example="20230715"),
    lead_time: Optional[int] = Query(None, example=48),
    variable: Optional[str]  = Query(None, example="tp"),
):
    """
    Filter skill_scores.json by any combination of date/lead_time/variable.
    Returns all records if no filters supplied (useful for dashboard charting).
    """
    records = _load_skill_scores()
    if not records:
        raise HTTPException(503, "skill_scores.json not found. Run operational pipeline first.")

    if date:
        raw_date = date.replace("-", "")
        records = [r for r in records if r["date"] == raw_date]
    if lead_time:
        records = [r for r in records if r["lead_time_hours"] == lead_time]
    if variable:
        records = [r for r in records if r["variable"] == variable]

    if not records:
        raise HTTPException(404, "No skill score records match the requested filters.")

    return {"count": len(records), "records": records}


# ─── GET /extreme-guidance ────────────────────────────────────────────────────

@app.get("/extreme-guidance", summary="IMD hazard alerts for a date & optional lead_time")
def get_extreme_guidance(
    date: str = Query(..., example="20230715"),
    lead_time: Optional[int] = Query(None, example=48),
):
    """
    Returns IMD extreme weather alert records for the given date.
    Optionally filter by lead_time. Schema.md §6 /extreme-guidance.
    """
    raw_date = date.replace("-", "")
    guide_path = OUTPUT_DIR / f"extreme_guidance_{raw_date}.json"
    if not guide_path.exists():
        raise HTTPException(404, f"extreme_guidance_{raw_date}.json not found.")

    with open(guide_path) as f:
        data = json.load(f)

    alerts = data.get("alerts", [])
    if lead_time is not None:
        alerts = [a for a in alerts if a.get("lead_time_hours") == lead_time]

    return {
        "date":            f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}",
        "lead_time_hours": lead_time,
        "alerts":          alerts,
    }


# ─── POST /simulate-dropout ───────────────────────────────────────────────────

class DropoutRequest(BaseModel):
    date: str               # YYYYMMDD or YYYY-MM-DD
    lead_time: int
    variable: str
    disabled_models: list[str]


@app.post("/simulate-dropout", summary="Recompute weights with selected models disabled")
def simulate_dropout(req: DropoutRequest):
    """
    Operational resilience demo (AppFlow.md §3 — Fallback Demo screen).
    Disables the listed models, renormalises remaining weights to sum=1,
    and returns the redistributed weight grid. No crash, no blank map.
    Schema.md §6 /simulate-dropout — same response shape as /weights.
    """
    date = req.date.replace("-", "")
    _validate_params(date, req.lead_time, req.variable)

    # Validate disabled_models
    for m in req.disabled_models:
        if m not in SOURCE_MODELS:
            raise HTTPException(422, f"Unknown model '{m}'. Valid: {SOURCE_MODELS}")
    active = [m for m in SOURCE_MODELS if m not in req.disabled_models]
    if not active:
        raise HTTPException(422, "Cannot disable all models — at least one must remain active.")

    # Load existing weight maps
    nc_path = OUTPUT_DIR / f"weights_{req.variable}_{date}_lt{req.lead_time}h.nc"
    if not nc_path.exists():
        raise HTTPException(404, f"weights_{req.variable}_{date}_lt{req.lead_time}h.nc not found.")

    with xr.open_dataset(nc_path) as ds:
        weight_arrs = {m: ds[f"weight_{m}"].values[0].astype(float) for m in SOURCE_MODELS}

    # Zero-out disabled models and renormalise
    for m in req.disabled_models:
        weight_arrs[m] = np.zeros_like(weight_arrs[m])
    
    total = sum(weight_arrs[m] for m in active)
    zero_mask = total < 1e-9
    safe_total = np.where(zero_mask, 1.0, total)
    for m in active:
        norm_w = weight_arrs[m] / safe_total
        weight_arrs[m] = np.where(zero_mask, 1.0 / len(active), norm_w)


    # Dominant model after redistribution
    stacked = np.stack([weight_arrs[m] for m in SOURCE_MODELS], axis=0)
    dominant_idx   = np.argmax(stacked, axis=0)
    dominant_grid  = np.array(SOURCE_MODELS)[dominant_idx].tolist()

    return {
        "date":             f"{date[:4]}-{date[4:6]}-{date[6:]}",
        "lead_time_hours":  req.lead_time,
        "variable":         req.variable,
        "disabled_models":  req.disabled_models,
        "active_models":    active,
        "models":           SOURCE_MODELS,
        "grid": {
            "lat":            TARGET_LATS.tolist(),
            "lon":            TARGET_LONS.tolist(),
            "dominant_model": dominant_grid,
            "weights": {
                m: np.where(np.isnan(weight_arrs[m]), None, weight_arrs[m]).tolist()
                for m in SOURCE_MODELS
            },
        },
    }


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health", include_in_schema=False)
def health():
    dates = _available_dates()
    models_ready = all((MODELS_DIR / f"blender_{v}_v1.pkl").exists() for v in VARIABLES)
    return {
        "status":        "ok",
        "available_dates": len(dates),
        "models_loaded": models_ready,
    }
