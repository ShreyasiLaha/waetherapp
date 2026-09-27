# Implementation Plan — 3-Day Hackathon Build

> Assumes a 6-person team. Adjust hours to actual hackathon duration, but keep phase order — later phases depend on earlier ones being locked.

## Phase 0 — Setup (first 2–3 hours)
- [ ] Lock frontend choice: Streamlit vs React+Leaflet (TRD.md §1) — **no changing mid-hackathon**
- [ ] Create repo, shared `/data` folder convention (Schema.md §2), register for Copernicus CDS API access (needed for ERA5)
- [ ] Each member confirms local env: Python 3.10+, install `xarray`, `dask`, `netCDF4`, `cfgrib`, `scikit-learn`, chosen frontend libs
- [ ] Assign module owners (Data / ML / Backend / Frontend / Operational Script)

## Phase 1 — Data Procurement & Regridding (Day 1)
**Owner: Geospatial Data Engineers**
- [ ] Download ERA5 verification truth for bounding box (Lat 5°–35°N, Lon 65°–100°E) and variables: `tp`, `t2m`, `ws10` (Schema.md §1)
  - *Reference snippet for ERA5 CDS API:*
    ```python
    import cdsapi
    c = cdsapi.Client()
    c.retrieve(
        'reanalysis-era5-single-levels',
        {
            'product_type': 'reanalysis',
            'variable': ['2m_temperature', 'total_precipitation', '10m_wind_speed'],
            'year': '2023',
            'month': ['07', '08'],
            'day': ['01', '02', '03'],  # Focus on key monsoon/cyclone dates
            'time': ['00:00', '06:00', '12:00', '18:00'],
            'area': [35.0, 65.0, 5.0, 100.0],  # North, West, South, East
            'format': 'netcdf',
        },
        'data/truth/era5/era5_raw.nc')
    ```
- [ ] Download matching-date GFS data (NWP source, proxy for NCUM)
- [ ] Download AI-model reforecast subset (GraphCast / Pangu-Weather from NOAA Open Data AWS)
- [ ] **Fallback plan if downloads are too slow:** use a 1–2 month focused window, prioritizing a known monsoon depression or cyclone period
- [ ] Write regridding script: conservative remap all sources → 0.25° common grid (TRD.md §3)
- [ ] Validate: open one regridded file per source, confirm matching lat/lon/lead_time dims (Schema.md §3)

**Exit criteria:** `/data/regridded/` and `/data/truth/` populated and dimensionally aligned for at least 1 severe weather period.

## Phase 2 — Feature Engineering & Blending Models (Day 1 evening – Day 2 morning)
**Owner: ML Engineers**
- [ ] Build `features.parquet` per Schema.md §4 including `lead_time_hours` (24, 48, 72, 120), spatial coordinates, and model disagreement features
- [ ] Train baseline blending models (scikit-learn Gradient Boosting / LightGBM) predicting adaptive model weights for `tp`, `t2m`, and `ws10`
- [ ] Implement quantile / weighted loss penalizing under-prediction of extremes (TRD.md §4) — **do not ship with plain MSE**
- [ ] Run batch inference → produce `blended_*.nc` and `weights_*.nc` across lead times (Schema.md §2–3)
- [ ] Compute skill scores vs individual models → `skill_scores.json` (Schema.md §5)

**Exit criteria:** Blended RMSE beats every individual model's RMSE across key lead times. If not yet achieved, prioritize tuning loss weights over UI styling.

## Phase 3 — Operational Script & Backend Layer (Day 2)
**Owner: Backend / Automation Engineers**
- [ ] Write `scripts/run_operational_blend.py` to automate routine end-to-end execution:
  - Ingests incoming model files → conservative regrid → inference across lead times → generates output NetCDFs → detects IMD hazard alerts.
- [ ] If Streamlit (Option A): build data-loading functions directly reading `/data/output/` and handle the `/simulate-dropout` logic natively via `st.session_state`.
- [ ] If React+Leaflet (Option B): build FastAPI endpoints exactly per Schema.md §6 (`/forecast`, `/weights`, `/skill-scores`, `/extreme-guidance`, `/simulate-dropout`).
- [ ] Implement fallback redistribution logic (re-normalize weights across remaining models live).

**Exit criteria:** Automated script runs via CLI cleanly; frontend/API can fetch forecast, weight maps, extreme alerts, and skill scores.

## Phase 4 — Command Center Dashboard (Day 2 – Day 3 morning)
**Owner: UI/UX + Frontend Developers**
- [ ] Build layout per Design.md and AppFlow.md:
  - Top context bar: Date picker, Lead Time toggle (+24h, +48h, +72h, +120h), Variable tabs (Rainfall, Temp, Wind).
  - Main map: Blended forecast view with toggleable categorical Model Weight overlay.
  - Extreme weather alert banner with IMD-calibrated hazard cards (Heavy Rain, Heatwave, High Wind).
  - Skill score sidebar (RMSE & ACC delta comparisons).
  - Cell explainability drawer and Fallback/Dropout stress-test toggle.

**Exit criteria:** End-to-end interactive demo operates smoothly with zero lag or render crashes.

## Phase 5 — Stress-Test Prep & Deployment (Day 3)
- [ ] Rehearse Judge Q&A answers (Rules.md §7) against the live demo with MoES/NCMRWF context
- [ ] Stress test model feed dropout live, verifying instant weight re-normalization
- [ ] Prepare extreme weather case study walk-through (showing peak preservation vs naive averaging)
- [ ] Run and showcase `python scripts/run_operational_blend.py` to prove the operational automation deliverable
- [ ] Deploy to free hosting (Streamlit Cloud or Vercel + Render)

## Explicit De-scope Order (cut in this order if time runs out)
1. Stretch deep learning models (Transformer/GNN) → rely on the optimized gradient boosted tree blender
2. Wind speed historical range → keep wind speed focused on 1 cyclone/depression event while full temporal history covers rain/temp
3. Second NWP source model → reduce to 2 total models (1 NWP + 1 AI) if data download bandwidth is constrained
4. Complex animations → keep interface snappy, functional, and scientific

**Never cut:** extreme-preservation loss function, skill score comparison across lead times, operational automation script, and fallback demo.
