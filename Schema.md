# Schema — Data, File & API Schemas

> This is the exact contract every script/module must follow. If a field is not defined here, do not invent it — add it here first, then implement.

## 1. Fixed Spatial & Variable Scope
```
bounding_box:
  lat_min: 5.0
  lat_max: 35.0
  lon_min: 65.0
  lon_max: 100.0
target_grid_resolution: 0.25  # degrees
variables:
  - name: t2m          # 2m temperature
    units: Kelvin       # convert to Celsius only at display layer, not in storage
  - name: tp            # total precipitation, 24hr accumulated
    units: mm
source_models:
  - id: model_nwp1      # e.g., GFS
  - id: model_nwp2      # e.g., TIGGE ensemble member (optional/stretch)
  - id: model_ai1       # e.g., GraphCast reforecast
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
    blended_{variable}_{YYYYMMDD}.nc
    weights_{variable}_{YYYYMMDD}.nc
    skill_scores.json
/models
  blender_v1.pkl   (or .pt)
```
Naming convention is fixed. Do not introduce alternate naming (e.g., date formats other than `YYYYMMDD`) anywhere in the pipeline.

## 3. NetCDF Variable Schema (regridded + output files)
Every `.nc` file in `/regridded`, `/truth`, and `/output` must share these dimensions/coords so xarray operations align without manual reindexing:
```
dims: (lat, lon, time)
coords:
  lat: float64, 5.0 to 35.0 step 0.25
  lon: float64, 65.0 to 100.0 step 0.25
  time: datetime64, one value per file (daily) or multiple for a batch file
data_vars:
  t2m: float32, dims (time, lat, lon)     # if variable == t2m
  tp:  float32, dims (time, lat, lon)     # if variable == tp
```
`weights_{variable}_{date}.nc` additionally has one data variable per source model, each `(time, lat, lon)`, values in `[0, 1]`, summing to 1 across models at every cell:
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
| date | datetime | forecast valid date |
| lead_time_hours | int | forecast lead time |
| model_nwp1_value | float32 | raw regridded value from source |
| model_nwp2_value | float32 | raw regridded value from source (nullable) |
| model_ai1_value | float32 | raw regridded value from source |
| cross_model_variance | float32 | engineered "disagreement" feature |
| day_of_year | int | seasonality feature |
| truth_value | float32 | ERA5 value — training target only, not present at inference |

## 5. Skill Scores Schema (`skill_scores.json`)
```json
{
  "date": "2023-07-15",
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

### `GET /forecast?date=2023-07-15&variable=tp`
Response:
```json
{
  "date": "2023-07-15",
  "variable": "tp",
  "grid": {
    "lat": [5.0, 5.25, "..."],
    "lon": [65.0, 65.25, "..."],
    "values": [[0.0, 1.2, "..."], "..."]
  }
}
```

### `GET /weights?date=2023-07-15&variable=tp`
Response:
```json
{
  "date": "2023-07-15",
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

### `GET /skill-scores?date=2023-07-15&variable=tp`
Response: same shape as §5 above.

### `POST /simulate-dropout`
Request:
```json
{ "date": "2023-07-15", "variable": "tp", "disabled_models": ["model_ai1"] }
```
Response: same shape as `/weights`, recomputed with remaining models re-normalized to sum to 1.

**Rule:** No other endpoints should be added without first updating this section.
