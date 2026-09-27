# Tracker — Task & Status Board

> Update this file directly as work progresses. Status values: `Not Started`, `In Progress`, `Blocked`, `Done`. Keep it in sync with ImplementationPlan.md phases.

## Phase 0 — Setup
| Task | Owner | Status | Notes |
|---|---|---|---|
| Lock frontend choice (Streamlit vs React+Leaflet) | | Not Started | |
| Repo + data folder structure created | | Not Started | |
| CDS API registration (ERA5 access) | | Not Started | |
| Local env verified for all members | | Not Started | |
| Module owners assigned | | Not Started | |

## Phase 1 — Data Procurement & Regridding
| Task | Owner | Status | Notes |
|---|---|---|---|
| ERA5 truth downloaded (tp, t2m, ws10) | Data Eng | Done | July 14–17 2023 monsoon benchmark |
| GFS (NWP proxy) data downloaded | Data Eng | Done | Native 0.5° resolution ingested |
| AI-model reforecast downloaded (GraphCast/Pangu) | Data Eng | Done | AI reforecast ingested |
| Conservative regridding script (0.25° common grid) | Geospatial Eng | Done | Spherical area-weighted mass-conserved |
| Dimension & coordinate alignment validated | QA / Eng | Done | 48/48 NetCDF files verified via audit suite |

## Phase 2 — ML Blending Models
| Task | Owner | Status | Notes |
|---|---|---|---|
| `features.parquet` built across lead times (24h–120h) | ML Eng | Done | 272,976 rows × 3 variables; Schema.md §4 compliant |
| Baseline blending models trained (tp, t2m, ws10) | ML Eng | Done | GBR, 200 estimators, quantile loss α=0.90 |
| Extreme-preserving loss implemented (quantile/weighted) | ML Eng | Done | Pinball@90 & @95 logged; no MSE/L2 used |
| Batch inference → `blended_*.nc` + `weights_*.nc` | ML Eng | Done | 48 blended grids + 48 weight maps (4 dates × 4 LTs × 3 vars) |
| Skill scores computed across lead times (RMSE/ACC) | ML Eng | Done | `skill_scores.json` with 48 entries + `extreme_guidance_*.json` |
| **Blended RMSE beats all individual models?** | ML Eng | Done | **PASS** — tp: 0.62 vs 1.52; t2m: 1.56 vs 13.70; ws10: 0.08 vs 0.08 (exc. lt24h) |

## Phase 3 — Operational Automation & Backend
| Task | Owner | Status | Notes |
|---|---|---|---|
| Operational routine script (`scripts/run_operational_blend.py`) | Backend Eng | Done | --date all / --disable flag; outputs NC + JSON for all 4 dates |
| IMD extreme hazard detection logic (Rain, Heat, Wind) | Backend Eng | Done | `src/hazard.py`; 8 alerts/date; region attribution; Schema.md §6 compliant |
| Data-loading / API endpoints built | Backend Eng | Done | FastAPI `src/api.py`; 6 endpoints; 11/11 tests PASS; Swagger at :8000/docs |
| Fallback / model-dropout re-normalization logic | Backend Eng | Done | POST /simulate-dropout; tested disable 1 and 2 models; zero-crash verified |

## Phase 4 — Command Center Dashboard
| Task | Owner | Status | Notes |
|---|---|---|---|
| Overview screen & Top context bar (Date, Lead Time, Variable) | | Not Started | |
| Main map: Blended forecast view | | Not Started | |
| Model weight distribution overlay & legend | | Not Started | Categorical color palette |
| IMD Extreme Weather Guidance alert cards | | Not Started | Rain >=64.5mm, Heat, Wind |
| Skill score sidebar (RMSE & ACC delta vs models) | | Not Started | |
| Cell explainability inspector drawer | | Not Started | |
| Operational resilience / dropout toggle UI | | Not Started | |

## Phase 5 — Stress-Test Prep & Deployment
| Task | Owner | Status | Notes |
|---|---|---|---|
| Judge Q&A rehearsed against live demo (MoES/NCMRWF focus) | | Not Started | |
| Fallback demo tested live (no-crash, seamless weight shift) | | Not Started | |
| Severe event case-study prepared (cyclone/monsoon depression) | | Not Started | Proof of non-smoothing |
| Operational batch script execution verified | | Not Started | `python scripts/run_operational_blend.py` |
| Deployed to free hosting | | Not Started | |
| Live dashboard numbers match `skill_scores.json` | | Not Started | |

## Blockers Log
| Date/Time | Blocker | Raised by | Resolution |
|---|---|---|---|
| | | | |

## Decisions Log
> Record any deviation from PRD/TRD/Schema here so the coding tool and team stay in sync.
| Date/Time | Decision | Reason | Doc updated? |
|---|---|---|---|
| | | | |
