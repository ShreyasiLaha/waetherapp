# AppFlow — Data & User Flow

## 1. High-Level Data Pipeline Flow (build/run once, offline)

```
[1] Download raw data
    ERA5 (truth) + GFS (NWP) + AI-model reforecast
    → bounding box: 5–35°N, 65–100°E
    → variables: t2m, tp
    → saved as raw .nc / .grib files in /data/raw/
        ↓
[2] Regrid
    Each source's native grid → conservative remap → common 0.25° grid
    → saved as /data/regridded/{model}_{var}_{date}.nc
        ↓
[3] Feature engineering
    Build per-cell, per-timestep feature table:
    [model_A_value, model_B_value, model_C_value, lead_time, day_of_year,
     cross-model variance/disagreement, previous-step truth (if available)]
    → saved as /data/features/features.parquet
        ↓
[4] Train blending model
    Input: features.parquet, target: ERA5 truth value
    Loss: quantile/weighted loss (see TRD.md §4)
    → saved as /models/blender_v1.pkl (or .pt for PyTorch)
        ↓
[5] Batch inference
    For each date in the demo window, run blender → produce:
      - blended_forecast.nc  (final value per cell)
      - weights.nc           (per-model weight per cell)
    → saved as /data/output/
        ↓
[6] Skill score computation
    Compare blended_forecast.nc AND each raw model vs ERA5 truth
    → RMSE, ACC per model → saved as /data/output/skill_scores.json
```

## 2. Serving Flow (runtime, when dashboard is opened)

```
User opens dashboard
        ↓
Dashboard loads available dates from /data/output/ (or calls GET /dates)
        ↓
User selects: date + variable (t2m or tp)
        ↓
        ├── Dashboard requests blended_forecast for that date
        │        → renders as choropleth/heatmap on map (Leaflet/streamlit-folium)
        │
        ├── Dashboard requests weight map for that date
        │        → renders as overlay: color = dominant model per cell
        │
        └── Dashboard requests skill_scores for that date
                 → renders as bar chart: RMSE/ACC, blended vs each model
        ↓
User clicks a specific grid cell (P2 feature)
        ↓
Explainability panel opens:
    shows raw values from each source model at that cell,
    the assigned weight per model,
    and the detected "regime" (e.g., "extreme rainfall — NWP-weighted")
        ↓
User toggles "Simulate model dropout" (e.g., disable AI model feed)
        ↓
Backend/logic re-normalizes weights across remaining models live
        ↓
Map + weight overlay re-render immediately, no crash, no blank map
```

## 3. Screen-Level Flow (dashboard)

1. **Landing / Overview screen**
   - Header: "RituGrid" (app name — see Design.md §0), with the descriptive subtitle underneath
   - Short project description, date picker, variable toggle (Temp / Rainfall)
2. **Main Map screen**
   - Left/main panel: blended forecast map
   - Toggle button: switch to "Weight Distribution" overlay on the same map
   - Right sidebar: skill score comparison chart for the selected date
3. **Explainability screen/panel** (triggered by map click)
   - Per-model raw values, assigned weights, regime label
4. **Fallback Demo screen/section**
   - A clearly labeled "Stress Test" toggle: "AI model feed DOWN" switch
   - Shows before/after weight redistribution

## 4. Error / Edge Case Flows (must be handled — do not skip)
- **Missing data for a selected date** → show a clear "no data for this date" message, do not crash, do not show a blank/broken map.
- **One source model missing for a valid date** → automatically trigger fallback redistribution (this is a demo-critical feature, not just an edge case).
- **User selects a date outside the pre-processed range** → disable those dates in the date picker rather than allowing an invalid request.
