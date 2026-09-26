# TRD — Technical Requirements Document

> This doc is the single source of truth for tech choices. The coding tool must not substitute a library, dataset, or service not listed here without flagging it as an assumption first.

## 1. Tech Stack (100% free / free-tier — hackathon safe)

### Data & Geospatial
- **xarray** — multidimensional (NetCDF/GRIB) array handling
- **dask** — out-of-core / parallel processing for large grids
- **netCDF4** / **h5netcdf** — file I/O
- **cfgrib** — reading GRIB files (GFS/ECMWF format)
- **xesmf** (or `xarray-regrid` if xESMF install fails on the judge's machine — it needs ESMF binaries) — conservative regridding between model grids
- **rioxarray** — optional, for raster/CRS operations

### ML / Blending Model
- **scikit-learn** (free) — baseline: Gradient Boosting Regressor / Random Forest per-cell weight predictor. **Build this first — it's the safe fallback that always works.**
- **PyTorch** (free) — stretch goal: small Attention/Transformer or ST-GNN model for dynamic regime-aware weighting
- **NumPy / pandas** — glue

### Backend / API
- **FastAPI** (free, Python) — serves blended forecast + weight map + skill scores as JSON/GeoJSON endpoints
- **Uvicorn** — ASGI server

### Frontend / Dashboard
Pick ONE, do not mix mid-hackathon:
- **Option A (fastest): Streamlit** — Python-only, fastest to a working demo, built-in charts, `streamlit-folium` for maps
- **Option B (more polished): React + Leaflet.js** — Leaflet is free/open-source (unlike Mapbox, which has usage limits); use free OpenStreetMap tiles

> Default recommendation for a hackathon team: **Streamlit + streamlit-folium**, unless the team already has strong React experience. This decision must be locked in Day 1 (see ImplementationPlan.md).

### Storage
- Local filesystem / mounted volume for `.nc` files during the hackathon (no DB needed for raw grids)
- **SQLite** (free, zero-setup) — only if you need to store computed skill-score history or metadata; do not introduce Postgres/Supabase unless the team already knows it
- Optional: free-tier **AWS S3** bucket or **Google Drive** for team data sharing (pre-download once, share the bundle)

### Deployment (all free tiers)
- **GitHub** — repo + version control
- **Streamlit Community Cloud** (free) if using Option A, OR **Render.com free tier / Vercel (frontend) + Render (FastAPI backend)** if using Option B
- **Google Colab** (free GPU/TPU) — for any model training step that needs more compute than a laptop

## 2. Data Sources (use exactly these — do not substitute)
| Data | Source | Access | Cost |
|---|---|---|---|
| Ground truth | ECMWF ERA5 Reanalysis | Copernicus Climate Data Store (CDS) API | Free (registration required) |
| NWP model | NOAA GFS | NOAA Open Data / NOMADS | Free |
| NWP ensemble (stretch) | TIGGE dataset | ECMWF | Free (registration required) |
| AI model reforecasts | NOAA Open Data (GraphCast / Pangu-Weather reforecasts) | AWS Open Data Registry | Free, no AWS account needed for public buckets |

**Bounding box (fixed — do not change):** Lat 5°N–35°N, Lon 65°E–100°E (Indian subcontinent).
**Variables (fixed — do not add more mid-hackathon):** 2m Temperature (`t2m`), 24hr accumulated precipitation (`tp`).
**Time range:** 1 year of historical data minimum, ideally including one monsoon or cyclone period for the extreme-event demo.

## 3. Regridding Requirement
All source models are on different native grids. Do NOT use naive bilinear/nearest-neighbor interpolation for precipitation — it violates mass conservation. Use **conservative remapping** (`xesmf.Regridder(method="conservative")`) to align all sources + ERA5 truth onto a shared **0.25° × 0.25°** target grid before any blending step.

## 4. Blending Model Requirements
- Input per grid cell per time step: values from each source model + engineered features (lead time, season/day-of-year, recent variance across models as a "disagreement" signal).
- Output: a weight per source model per cell, summing to 1 (softmax or normalized regression output).
- **Loss function must penalize under-prediction of extremes** — use quantile loss (e.g., pinball loss at the 90th/95th percentile) or a weighted MSE that up-weights high-value truth cells. A plain MSE/L2 loss is explicitly disallowed for the final model — it is the exact failure mode judges will probe (see PRD.md Risks).
- Model must support a "regime" fallback: if a model's input is missing/NaN for a given step, redistribute its weight proportionally among the remaining models (this is the fallback-mode feature, not a training-time concern — implement it as a rule in the inference/serving layer, not inside the trained model).

## 5. Skill Score Requirements
Implement exactly these two metrics, computed for the blended output AND each individual source model, for direct comparison:
- **RMSE** (Root Mean Square Error) vs ERA5 truth
- **ACC** (Anomaly Correlation Coefficient) vs ERA5 climatology anomaly

Both must be shown side-by-side in the dashboard (table or bar chart) — this is a P0 deliverable, not decoration.

## 6. Performance / Scope Constraints
- Do not attempt to process more than the fixed bounding box and 2 variables.
- Pre-download data once, cache locally (or on shared S3/Drive), and never re-download during dashboard runtime.
- Target dataset size after subsetting: low hundreds of MB to a few GB — must run on a normal laptop.
- **Memory Management:** When building the `features.parquet` file, process data iteratively by chunking along the time dimension using Dask (`xr.open_mfdataset(chunks={'time': '100MB'})`). Do not attempt to load a full year of multi-model data into RAM at once using standard pandas.

## 7. API Contract (if using FastAPI backend — Option B)
See Schema.md §3 for exact request/response JSON shapes. Do not invent additional endpoints beyond what's listed there without updating Schema.md first.
