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

## Phase 1 — Data & Regridding
| Task | Owner | Status | Notes |
|---|---|---|---|
| ERA5 truth downloaded (bounding box + vars) | | Not Started | |
| GFS (NWP) data downloaded | | Not Started | |
| AI-model reforecast downloaded | | Not Started | |
| Regridding script (conservative remap) | | Not Started | |
| Dimension alignment validated | | Not Started | |

## Phase 2 — ML Blending Model
| Task | Owner | Status | Notes |
|---|---|---|---|
| features.parquet built | | Not Started | |
| Baseline blending model trained | | Not Started | |
| Extreme-preserving loss implemented | | Not Started | |
| Batch inference → blended + weights .nc | | Not Started | |
| Skill scores computed (RMSE/ACC) | | Not Started | |
| **Blended RMSE beats all individual models?** | | Not Started | Blocking exit criterion |

## Phase 3 — Backend/Serving
| Task | Owner | Status | Notes |
|---|---|---|---|
| Data-loading / API functions built | | Not Started | |
| `/simulate-dropout` fallback logic | | Not Started | |
| Endpoint/function contract matches Schema.md §6 | | Not Started | |

## Phase 4 — Dashboard/Frontend
| Task | Owner | Status | Notes |
|---|---|---|---|
| Overview screen | | Not Started | |
| Main map screen (blended forecast) | | Not Started | |
| Weight-distribution overlay/toggle | | Not Started | |
| Skill score sidebar/chart | | Not Started | |
| Explainability panel (click-to-inspect) | | Not Started | |
| Fallback/stress-test toggle UI | | Not Started | |
| Extreme-event visual marker | | Not Started | |

## Phase 5 — Stress-Test Prep & Deployment
| Task | Owner | Status | Notes |
|---|---|---|---|
| Judge Q&A rehearsed against live demo | | Not Started | |
| Fallback demo tested (no-crash, multiple runs) | | Not Started | |
| Monsoon/cyclone walkthrough prepared | | Not Started | |
| Deployed to free hosting | | Not Started | |
| Live dashboard numbers match skill_scores.json | | Not Started | |

## Blockers Log
| Date/Time | Blocker | Raised by | Resolution |
|---|---|---|---|
| | | | |

## Decisions Log
> Record any deviation from PRD/TRD/Schema here so the coding tool and team stay in sync.
| Date/Time | Decision | Reason | Doc updated? |
|---|---|---|---|
| | | | |
