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
| ERA5 truth downloaded (tp, t2m, ws10) | | Not Started | |
| GFS (NWP proxy) data downloaded | | Not Started | |
| AI-model reforecast downloaded (GraphCast/Pangu) | | Not Started | |
| Conservative regridding script (0.25° common grid) | | Not Started | |
| Dimension & coordinate alignment validated | | Not Started | (lat, lon, time/lead_time) |

## Phase 2 — ML Blending Models
| Task | Owner | Status | Notes |
|---|---|---|---|
| `features.parquet` built across lead times (24h–120h) | | Not Started | |
| Baseline blending models trained (tp, t2m, ws10) | | Not Started | |
| Extreme-preserving loss implemented (quantile/weighted) | | Not Started | Non-negotiable |
| Batch inference → `blended_*.nc` + `weights_*.nc` | | Not Started | |
| Skill scores computed across lead times (RMSE/ACC) | | Not Started | |
| **Blended RMSE beats all individual models?** | | Not Started | **Blocking exit criterion** |

## Phase 3 — Operational Automation & Backend
| Task | Owner | Status | Notes |
|---|---|---|---|
| Operational routine script (`scripts/run_operational_blend.py`) | | Not Started | Core operational deliverable |
| IMD extreme hazard detection logic (Rain, Heat, Wind) | | Not Started | |
| Data-loading / API endpoints built | | Not Started | Matches Schema.md §6 |
| Fallback / model-dropout re-normalization logic | | Not Started | Zero-crash verification |

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
