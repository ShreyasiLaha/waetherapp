# PRD — RituGrid (Hybrid AI–NWP Multi-Model Forecast Blending System)

> **App Name: RituGrid.** Use this exact name as the product title everywhere it's referenced — UI header, browser tab title, README, pitch deck, and all docs in this set. Do not use the generic descriptor ("Hybrid AI–NWP Blending System") as the user-facing name; it's a subtitle/description only.
> **Problem Statement Context:** Ministry of Earth Sciences (MoES) / National Centre for Medium Range Weather Forecasting (NCMRWF) | Theme: Disaster Management.

## 1. Problem Statement
Meteorologists at NCMRWF/IMD must manually reconcile forecasts from multiple sources — physics-based Numerical Weather Prediction (NWP) models (NCUM, NEPS, GFS, ECMWF) and AI/ML weather models (GraphCast, Pangu-Weather, FourCastNet) — which perform inconsistently depending on region, season, lead time (Day 1 to Day 5), and weather regime. Simple averaging ("ensemble mean") smooths out extreme events (cyclone winds, localized cloudbursts, heatwave peaks), producing forecasts that are statistically balanced but operationally dangerous.

**We are NOT building a new weather prediction model.** We are building an **intelligent post-processing / dynamic blending layer** that sits on top of existing model outputs and dynamically decides, per grid cell, lead time, and season, how much to trust each source model.

## 2. Goals (Hackathon MVP scope)
1. Ingest forecast outputs from **3 source models** (2 NWP-like such as GFS/TIGGE as open proxies for NCUM/NEPS + 1 AI-like such as GraphCast/Pangu-Weather) for the Indian subcontinent bounding box.
2. Produce an **optimized blended forecast** for three critical meteorological variables: **Rainfall (`tp`)**, **Temperature (`t2m`)**, and **Wind Speed (`ws10`)**.
3. Dynamically assign and visualize **model weight maps** across regions and forecast lead times (+24h to +120h), showing which model is most reliable under specific weather regimes.
4. Measurably improve forecast skill: Blended output outperforms any individual input model on RMSE and Anomaly Correlation Coefficient (ACC) against ERA5 ground truth.
5. Provide **extreme weather guidance**: Preserve peaks and flag heavy rainfall (>=64.5 mm/day), heatwaves (>=40°C), and high-wind/gale conditions (>=50 km/h) without dampening extremes.
6. Deliver an **operational workflow**: Automated script for routine daily batch blending plus an interactive dashboard.
7. Demonstrate graceful fallback: if one model's feed is unavailable, weights must redistribute automatically without crashing.

## 3. Non-Goals (explicitly out of scope — do not build)
- Do NOT train a new AI weather forecaster from scratch.
- Do NOT attempt global coverage — bounding box only (Lat 5°N–35°N, Lon 65°E–100°E).
- Do NOT attempt real-time/live data ingestion during the hackathon — use pre-downloaded historical benchmark data (see TRD.md §2).
- Do NOT build user auth, billing, multi-tenant systems, or anything unrelated to the forecasting/visualization core.

## 4. Target Users / Stakeholders
- **Primary:** Operational forecasters at NCMRWF and India Meteorological Department (IMD) (need trust, lead-time reliability, and explainability).
- **Secondary:** National Disaster Response Force (NDRF), state disaster management authorities (SDMAs), aviation, and agriculture (need early, preserved extreme event alerts).
- **Judges (MoES / NCMRWF evaluators):** Domain scientists who will rigorously check skill scores (RMSE/ACC), extreme value preservation, and operational feasibility.

## 5. Core Features (MVP — build in this priority order)
| Priority | Feature | Description |
|---|---|---|
| P0 | Data pipeline | Ingest + regrid 3 model outputs + ERA5 truth onto a common 0.25°×0.25° grid for `tp`, `t2m`, `ws10` |
| P0 | Dynamic Blending model | Adaptive weight predictor conditioned on region, season, lead time (+24h to +120h), and cross-model disagreement |
| P0 | Skill score engine | Compute RMSE / ACC for blended output vs each individual model across lead times |
| P0 | Dashboard — blended map | Interactive map view showing blended forecast for selected date, lead time, and variable |
| P0 | Dashboard — weight map | Categorical overlay showing which model dominates per region and lead time |
| P1 | Extreme weather guidance | Visual flags/markers for IMD-threshold extreme events (heavy rain, heat wave, high wind) with zero smoothing |
| P1 | Operational script | Automated routine script (`run_operational_blend.py`) for automated scheduled forecast blending |
| P1 | Fallback simulation | UI toggle: "simulate model feed down" → weights redistribute live without system crash |
| P2 | Explainability panel | Click a cell → inspect raw values per model, assigned weight, and weather regime classification |

## 6. Success Metrics
- Blended forecast RMSE **lower** than best individual model across lead times.
- Blended forecast ACC **higher** than best individual model.
- Zero dampening of extreme peaks compared to simple arithmetic multi-model ensemble (MME).
- Zero crash on simulated model-dropout test.
- Weight maps are spatially and meteorologically coherent (e.g. physics NWP trusted more in coastal orographic rain, AI competitive in synoptic temperature).

## 7. Key Risks
- **Smoothing risk:** naive loss functions will average out extremes → mitigated via quantile/weighted loss (see TRD.md §4).
- **Grid mismatch:** different native resolutions → mitigated via conservative regridding (see TRD.md §3).
- **Data volume/time:** full historical downloads are too slow for a hackathon → mitigated via pre-bundled subset (see Schema.md §1, TRD.md §6).
- **Black-box distrust:** unexplained weights will be rejected by evaluators → mitigated by mandatory explainability panel.

## 8. Deliverables Checklist (map to Tracker.md)
- [ ] Working operational dashboard (deployed, free hosting)
- [ ] Automated routine blending script (`run_operational_blend.py`)
- [ ] Blended forecast for at least 1 full historical event (monsoon/cyclone period) across lead times
- [ ] Skill score comparison table/chart (blended vs each model for RMSE & ACC)
- [ ] Model weight distribution maps by region and lead time
- [ ] Extreme weather guidance panel (heatwave, heavy rain, high wind alerts)
- [ ] Fallback-mode demo (model drop-out test)
- [ ] 2-minute pitch narrative anchored on the Judge Q&A stress-test (see Rules.md §7)

