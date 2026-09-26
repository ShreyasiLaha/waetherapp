# PRD — RituGrid (Hybrid AI–NWP Multi-Model Forecast Blending System)

> **App Name: RituGrid.** Use this exact name as the product title everywhere it's referenced — UI header, browser tab title, README, pitch deck, and all docs in this set. Do not use the generic descriptor ("Hybrid AI–NWP Blending System") as the user-facing name; it's a subtitle/description only.

## 1. Problem Statement
Meteorologists at NCMRWF/IMD must manually reconcile forecasts from multiple sources — physics-based Numerical Weather Prediction (NWP) models (NCUM, GFS, ECMWF) and AI weather models (GraphCast, Pangu-Weather, FourCastNet) — which frequently disagree. Simple averaging ("ensemble mean") smooths out extreme events (cyclone rainfall spikes, heatwave peaks), producing forecasts that are statistically balanced but operationally dangerous.

**We are NOT building a new weather prediction model.** We are building an **intelligent post-processing / blending layer** that sits on top of existing model outputs and dynamically decides, per grid cell and per time step, how much to trust each source model.

## 2. Goals (Hackathon MVP scope)
1. Ingest historical forecast output from **3 source models** (2 NWP-like + 1 AI-like, or as substituted per Section 6 of TRD) for a bounded India region.
2. Produce a **blended forecast** that measurably outperforms any single input model on RMSE and Anomaly Correlation Coefficient (ACC) against ERA5 ground truth.
3. Preserve extremes: blended output must not flatten peak rainfall/temperature values below a defined threshold (see Rules.md, "Extreme Preservation Rule").
4. Visualize, per region and time step, **which model was trusted and why** (explainability is a scored deliverable, not a nice-to-have).
5. Demonstrate graceful fallback: if one model's feed is unavailable, weights must redistribute automatically without crashing.

## 3. Non-Goals (explicitly out of scope — do not build)
- Do NOT train a new AI weather forecaster from scratch.
- Do NOT attempt global coverage — bounding box only (see Schema.md, Section 1).
- Do NOT attempt real-time/live data ingestion during the hackathon — use pre-downloaded historical data (see TRD.md, Data Strategy).
- Do NOT build user auth, billing, multi-tenant systems, or anything unrelated to the forecasting/visualization core.

## 4. Target Users / Stakeholders
- **Primary:** Operational forecasters at NCMRWF/IMD (need trust + explainability).
- **Secondary:** Disaster management agencies (NDRF), aviation, agriculture sector (need reliability during extremes).
- **Judges (hackathon):** Domain scientists who will check skill scores and explainability, not just UI polish.

## 5. Core Features (MVP — build in this priority order)
| Priority | Feature | Description |
|---|---|---|
| P0 | Data pipeline | Ingest + regrid 3 model outputs + ERA5 truth onto a common 0.25°×0.25° grid |
| P0 | Blending model | Per-cell dynamic weight predictor (start simple: gradient-boosted regression; stretch: attention-based) |
| P0 | Skill score engine | Compute RMSE / ACC for blended output vs each individual model |
| P0 | Dashboard — blended map | Map view showing blended forecast for selected date/variable |
| P0 | Dashboard — weight map | Heatmap overlay showing which model dominates per region |
| P1 | Extreme event flag | Highlight cells where blending would have smoothed an extreme, and show it was preserved |
| P1 | Fallback simulation | UI toggle: "simulate AI model feed down" → weights redistribute live |
| P2 | Explainability panel | Click a cell → see per-model input values + assigned weight + reason (regime label) |

## 6. Success Metrics
- Blended forecast RMSE **lower** than best individual model (quantified, shown in dashboard).
- Blended forecast ACC **higher** than best individual model.
- Zero crash on simulated model-dropout test.
- Weight maps are spatially coherent (not noisy/random — a sign of overfitting judges will probe).

## 7. Key Risks
- **Smoothing risk:** naive loss functions will average out extremes → mitigated via custom loss (see TRD.md §4).
- **Grid mismatch:** different native resolutions → mitigated via conservative regridding (see TRD.md §3).
- **Data volume/time:** full historical downloads are too slow for a hackathon → mitigated via pre-bundled subset (see Schema.md §1, TRD.md §6).
- **Black-box distrust:** unexplained weights will be rejected by evaluators → mitigated by mandatory explainability panel (P2 feature is effectively P0 for judging).

## 8. Deliverables Checklist (map to Tracker.md)
- [ ] Working dashboard (deployed, free hosting)
- [ ] Blended forecast for at least 1 full historical event (ideally a monsoon/cyclone period)
- [ ] Skill score comparison table/chart (blended vs each model)
- [ ] Weight distribution map
- [ ] Fallback-mode demo
- [ ] 2-minute pitch narrative anchored on the Judge Q&A stress-test (see Rules.md §7)
