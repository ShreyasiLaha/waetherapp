# Schema — Data, File & API Schemas

> This is the exact contract every script/module must follow. If a field is not defined here, do not invent it — add it here first, then implement.

## 1. Fixed Spatial & Variable Scope
```yaml
bounding_box:
  lat_min: 5.0
  lat_max: 35.0
  lon_min: 65.0
  lon_max: 100.0
target_grid_resolution: 0.25  # degrees (~27 km at equator)
lead_times_hours: [24, 48, 72, 120] # Day 1, Day 2, Day 3, Day 5
variables:
  - name: tp            # total precipitation, 24hr accumulated
    units: mm
  - name: t2m           # 2m temperature
    units: Kelvin       # converted to Celsius only at display layer
  - name: ws10          # 10m wind speed
    units: m/s          # converted to km/h at display layer if desired
source_models:
  - id: model_nwp1      # e.g., GFS (open-data proxy for NCUM)
  - id: model_nwp2      # e.g., TIGGE / GEFS ensemble (proxy for NEPS)
  - id: model_ai1       # e.g., GraphCast / Pangu-Weather reforecast
truth_source: era5
```

## 2. File Structure (on disk)
```
/data
  /raw/{source_id}/{variable}_{YYYYMMDD}.nc
  /regridded/{source_id}/{variable}_{YYYYMMDD}.nc      # after conservative regrid to 0.25°
  /truth/era5/{variable}_{YYYYMMDD}.nc
  /features/features.parquet
  /output/
    blended_{variable}_{YYYYMMDD}_lt{lead_time}h.nc
    weights_{variable}_{YYYYMMDD}_lt{lead_time}h.nc
    skill_scores.json
    extreme_guidance_{YYYYMMDD}.json
/models
  blender_{variable}_v1.pkl   (or .pt)
/scripts
  run_operational_blend.py    # Unattended routine daily blending pipeline
```
Naming convention is fixed. Do not introduce alternate naming anywhere in the pipeline.

## 3. NetCDF Variable Schema (regridded + output files)
Every `.nc` file in `/regridded`, `/truth`, and `/output` must share these dimensions/coords:
```
dims: (lat, lon, time)
coords:
  lat: float64, 5.0 to 35.0 step 0.25
  lon: float64, 65.0 to 100.0 step 0.25
  time: datetime64, valid forecast verification timestamp
data_vars:
  tp:   float32, dims (time, lat, lon)     # if variable == tp
  t2m:  float32, dims (time, lat, lon)     # if variable == t2m
  ws10: float32, dims (time, lat, lon)     # if variable == ws10
```
`weights_{variable}_{date}_lt{lead_time}h.nc` additionally has one data variable per source model, each `(time, lat, lon)`, values in `[0, 1]`, summing to 1 across models at every cell:
```
data_vars:
  weight_model_nwp1: float32
  weight_model_nwp2: float32
  weight_model_ai1: float32
```

## 4. Feature Table Schema (`features.parquet`)
| column | type | description |
|---|---|---|
| lat | float32 | grid cell latitude |
| lon | float32 | grid cell longitude |
| date | datetime | forecast initialization date |
| lead_time_hours | int | forecast lead time (24, 48, 72, 120) |
| model_nwp1_value | float32 | raw regridded value from source |
| model_nwp2_value | float32 | raw regridded value from source (nullable) |
| model_ai1_value | float32 | raw regridded value from source |
| cross_model_variance | float32 | engineered "disagreement" feature across models |
| day_of_year | int | seasonality feature (1–366) |
| truth_value | float32 | ERA5 value — training target only, not present at inference |

## 5. Skill Scores Schema (`skill_scores.json`)
```json
{
  "date": "2023-07-15",
  "lead_time_hours": 48,
  "variable": "tp",
  "scores": {
    "model_nwp1": { "rmse": 4.21, "acc": 0.61 },
    "model_nwp2": { "rmse": 3.98, "acc": 0.64 },
    "model_ai1":  { "rmse": 3.85, "acc": 0.66 },
    "blended":    { "rmse": 2.90, "acc": 0.78 }
  }
}
```

## 6. API Schema (if FastAPI backend used — Design Option B)

### `GET /dates`
Response:
```json
{ "available_dates": ["2023-07-14", "2023-07-15", "2023-07-16"] }
```

### `GET /forecast?date=2023-07-15&lead_time=48&variable=tp`
Response:
```json
{
  "date": "2023-07-15",
  "lead_time_hours": 48,
  "variable": "tp",
  "units": "mm",
  "grid": {
    "lat": [5.0, 5.25, "..."],
    "lon": [65.0, 65.25, "..."],
    "values": [[0.0, 1.2, "..."], "..."]
  }
}
```

### `GET /weights?date=2023-07-15&lead_time=48&variable=tp`
Response:
```json
{
  "date": "2023-07-15",
  "lead_time_hours": 48,
  "variable": "tp",
  "models": ["model_nwp1", "model_nwp2", "model_ai1"],
  "grid": {
    "lat": ["..."],
    "lon": ["..."],
    "dominant_model": [["model_ai1", "model_nwp1", "..."], "..."],
    "weights": {
      "model_nwp1": [["..."]],
      "model_nwp2": [["..."]],
      "model_ai1": [["..."]]
    }
  }
}
```

### `GET /skill-scores?date=2023-07-15&lead_time=48&variable=tp`
Response: same shape as §5 above.

### `GET /extreme-guidance?date=2023-07-15&lead_time=48`
Response:
```json
{
  "date": "2023-07-15",
  "lead_time_hours": 48,
  "alerts": [
    {
      "type": "heavy_rainfall",
      "threshold": ">= 64.5 mm/day",
      "max_value": 142.3,
      "region": "Konkan & Goa",
      "dominant_model_used": "model_nwp1",
      "affected_cells": 18
    },
    {
      "type": "high_wind",
      "threshold": ">= 50 km/h",
      "max_value": 68.4,
      "region": "Gujarat Coast",
      "dominant_model_used": "model_nwp1",
      "affected_cells": 12
    }
  ]
}
```

### `POST /simulate-dropout`
Request:
```json
{ "date": "2023-07-15", "lead_time": 48, "variable": "tp", "disabled_models": ["model_ai1"] }
```
Response: same shape as `/weights`, recomputed with remaining models re-normalized to sum to 1.

**Rule:** No other endpoints should be added without first updating this section.
