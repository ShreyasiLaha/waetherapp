# Implementation Plan — 3-Day Hackathon Build

> Assumes a 6-person team per PRD.md §7 roles. Adjust hours to actual hackathon duration, but keep phase order — later phases depend on earlier ones being locked.

## Phase 0 — Setup (first 2–3 hours)
- [ ] Lock frontend choice: Streamlit vs React+Leaflet (TRD.md §1) — **no changing mid-hackathon**
- [ ] Create repo, shared `/data` folder convention (Schema.md §2), register for Copernicus CDS API access (needed for ERA5)
- [ ] Each member confirms local env: Python 3.10+, install `xarray`, `dask`, `netCDF4`, `cfgrib`, `scikit-learn`, chosen frontend libs
- [ ] Assign owners per module (Data / ML / Backend / Frontend) per PRD.md §7 team roles

## Phase 1 — Data Procurement & Regridding (Day 1)
**Owner: Geospatial Data Engineers**
- [ ] Download 1 year of ERA5 (truth) for bounding box + variables (Schema.md §1)
  - *Reference snippet for the AI tool for ERA5 CDS API:*
    ```python
    import cdsapi
    c = cdsapi.Client()
    c.retrieve(
        'reanalysis-era5-single-levels',
        {
            'product_type': 'reanalysis',
            'variable': ['2m_temperature', 'total_precipitation'],
            'year': '2023',
            'month': ['07', '08'],
            'day': ['01', '02', '03'],  # extend as needed
            'time': ['00:00', '06:00', '12:00', '18:00'],
            'area': [35.0, 65.0, 5.0, 100.0],  # North, West, South, East
            'format': 'netcdf',
        },
        'data/truth/era5/era5_raw.nc')
    ```
- [ ] Download matching-date GFS data (NWP source)
- [ ] Download AI-model reforecast subset (GraphCast/Pangu-Weather from NOAA Open Data / AWS)
- [ ] **Fallback plan if downloads are too slow:** use a 1–2 month window instead of 1 year, prioritize a known monsoon/cyclone period for the extreme-event story
- [ ] Write regridding script: conservative remap all sources → 0.25° common grid (TRD.md §3)
- [ ] Validate: open one regridded file per source, confirm matching lat/lon/time dims (Schema.md §3)

**Exit criteria:** `/data/regridded/` and `/data/truth/` populated and dimensionally aligned for at least a 1–2 month window.

## Phase 2 — Feature Engineering & Baseline Blending Model (Day 1 evening – Day 2 morning)
**Owner: ML Engineers**
- [ ] Build `features.parquet` per Schema.md §4
- [ ] Train baseline: scikit-learn Gradient Boosting Regressor predicting per-model weight (or directly predicting blended value — pick one approach and document it in Rules.md if it deviates)
- [ ] Implement quantile/weighted loss to preserve extremes (TRD.md §4) — **do not ship with plain MSE**
- [ ] Run batch inference → produce `blended_*.nc` and `weights_*.nc` (Schema.md §2–3)
- [ ] Compute skill scores → `skill_scores.json` (Schema.md §5)

**Exit criteria:** Blended RMSE beats every individual model's RMSE for at least the demo window. If not yet achieved, this blocks all downstream demo work — prioritize fixing this over UI polish.

## Phase 3 — Backend/Serving Layer (Day 2, parallel with Phase 2 tail end)
**Owner: Backend Developer**
- [ ] If Streamlit (Option A): build data-loading functions directly reading `/data/output/` and handle the `/simulate-dropout` logic natively via `st.session_state` — **do not build a separate API**.
- [ ] If React+Leaflet (Option B): build FastAPI endpoints exactly per Schema.md §6.
- [ ] Implement `/simulate-dropout` fallback logic (re-normalize weights across remaining models — TRD.md §4)

**Exit criteria:** Can fetch a forecast, a weight map, and skill scores for at least one demo date via the chosen serving method.

## Phase 4 — Dashboard/Frontend (Day 2 – Day 3 morning)
**Owner: UI/UX + supporting members**
- [ ] Build screens per AppFlow.md §3: Overview, Main Map, Explainability panel, Fallback Demo toggle
- [ ] Apply color system and layout rules from Design.md
- [ ] Wire up date/variable selectors to backend/data functions
- [ ] Implement extreme-event visual marker (Design.md §5) — this is a key differentiator, do not cut it under time pressure before cutting P2 polish items

**Exit criteria:** End-to-end demo works: pick a date → see blended map → toggle weight map → see skill scores → click cell for explanation → trigger fallback demo.

## Phase 5 — Stress-Test Prep & Polish (Day 3)
- [ ] Rehearse Judge Q&A answers (Rules.md §7) against the actual working demo — adjust wording if implementation differs from the original answers
- [ ] Test fallback/dropout demo live, multiple times, confirm no crash
- [ ] Prepare a monsoon/cyclone-period walkthrough showing extremes were preserved (Design.md §5)
- [ ] Deploy to free hosting (TRD.md §1) — do this early enough (by mid Day 3) to leave buffer for deployment bugs
- [ ] Final skill-score sanity check: confirm numbers shown in the live deployed dashboard match `skill_scores.json`, not stale cached values

## Explicit De-scope Order (cut in this order if time runs out)
1. Stretch ML model (Transformer/ST-GNN) → fall back to scikit-learn baseline
2. P2 explainability panel detail → keep it minimal (just show raw values + weights, skip regime-label copywriting)
3. Second NWP source model → reduce to 2 total source models (1 NWP + 1 AI) if data download is the bottleneck
4. Visual polish (animations, transitions) → keep functional, unstyled if needed

**Never cut:** extreme-preservation loss function, skill score comparison, fallback/dropout demo — these are the three things judges explicitly probe per PRD.md §7 Q&A stress-test.
