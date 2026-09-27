# AppFlow — Data & User Flow

## 1. High-Level Data Pipeline Flow (build/run once, offline & batch operational)

```
[1] Ingest raw model data
    ERA5 (truth) + GFS/TIGGE (NWP proxy for NCUM/NEPS) + AI-model (GraphCast/Pangu)
    → bounding box: 5–35°N, 65–100°E
    → variables: tp (Rainfall), t2m (Temperature), ws10 (Wind Speed)
    → lead times: +24h, +48h, +72h, +120h
    → saved as raw .nc / .grib files in /data/raw/
        ↓
[2] Regrid
    Each source's native grid → conservative remap → common 0.25° grid
    → saved as /data/regridded/{model}_{var}_{date}.nc
        ↓
[3] Feature engineering
    Build per-cell, per-lead-time feature table:
    [model_A_val, model_B_val, model_C_val, lead_time_hours, day_of_year,
     cross_model_variance, lat, lon]
    → saved as /data/features/features.parquet
        ↓
[4] Train blending models
    Separate / joint models for tp, t2m, ws10
    Target: ERA5 truth value
    Loss: quantile/weighted loss (see TRD.md §4) to preserve heavy extremes
    → saved as /models/blender_{var}_v1.pkl
        ↓
[5] Operational Routine Pipeline (/scripts/run_operational_blend.py)
    For current or historical dates + lead times (+24h to +120h):
      - Run blender → produce blended_forecast.nc & weights.nc
      - Detect IMD extreme hazards (Rain >=64.5mm, Heatwave >=40°C, Wind >=50km/h)
      - Export /data/output/extreme_guidance_{date}.json
        ↓
[6] Skill score computation
    Compare blended_forecast.nc AND each raw model vs ERA5 truth
    → RMSE, ACC per model & lead time → saved as /data/output/skill_scores.json
```

## 2. Serving Flow (runtime, when dashboard is opened)

```
User opens dashboard
        ↓
Dashboard loads available dates from /data/output/ (or calls GET /dates)
        ↓
User selects: Date + Lead Time (+24h / +48h / +72h / +120h) + Variable (Rainfall / Temp / Wind)
        ↓
        ├── Dashboard requests blended_forecast for selected params
        │        → renders as choropleth/heatmap on map (Leaflet / streamlit-folium)
        │
        ├── Dashboard requests weight map for selected params
        │        → renders as categorical overlay: color = dominant model per cell
        │
        ├── Dashboard requests extreme_guidance for selected date & lead time
        │        → renders IMD Alert Banner (Heavy Rain / Heatwave / Gale Wind alerts)
        │
        └── Dashboard requests skill_scores for selected date, lead time, & variable
                 → renders as bar chart: RMSE/ACC, blended vs each model
        ↓
User clicks a specific grid cell (P2 feature)
        ↓
Explainability panel opens:
    shows raw values from each source model at that cell,
    the assigned weight per model,
    and the detected "regime" (e.g., "Orographic heavy rainfall — NWP-weighted due to physics fidelity")
        ↓
User toggles "Simulate model dropout" (e.g., disable AI model feed)
        ↓
Backend/logic re-normalizes weights across remaining models live
        ↓
Map + weight overlay re-render immediately, no crash, no blank map
```

## 3. Screen-Level Flow (dashboard)

1. **Landing / Overview screen**
   - Header: "RituGrid" (app name — see Design.md §0), subtitle: "Hybrid AI–NWP Multi-Model Forecast Blending System"
   - Context controls: Date picker, Lead Time selector (+24h, +48h, +72h, +120h), Variable tabs (Rainfall `tp`, Temperature `t2m`, Wind Speed `ws10`)
   - Top Alert Banner: IMD-calibrated extreme weather warnings for active selection
2. **Main Map screen**
   - Left/main panel: Blended forecast map with extreme hazard outline markers
   - Layer Toggle: Blended Forecast vs. Model Weight Distribution overlay
   - Right sidebar: Skill score comparison chart (RMSE & ACC delta vs individual models)
3. **Explainability screen/panel** (triggered by map click)
   - Per-model raw values, assigned weights, regime explanation label
4. **Fallback Demo screen/section**
   - Labeled "Operational Resilience Test": "Simulate Model Feed Failure" switch
   - Shows real-time redistribution of weights without service disruption

## 4. Error / Edge Case Flows (must be handled — do not skip)
- **Missing data for a selected date/lead time** → show a clear "no data for this selection" message, do not crash, do not show a blank/broken map.
- **One source model missing for a valid date** → automatically trigger fallback redistribution (demonstrating operational robustness).
- **User selects a date outside the pre-processed range** → disable those dates in the date picker rather than allowing an invalid request.
