# Rules — Grounding Rules for the AI Coding Tool (Antigravity)

> Purpose: this file exists specifically to stop the coding tool from inventing scope, libraries, datasets, or APIs that aren't real or aren't part of this project. Read this file before generating any code. If a requested change conflicts with these rules, flag it instead of silently complying.

## 1. Source-of-Truth Hierarchy
When docs conflict, resolve in this order: **Rules.md → Schema.md → TRD.md → PRD.md → AppFlow.md → Design.md → ImplementationPlan.md → Tracker.md.**
Never invent a field, file name, endpoint, or variable that isn't defined in Schema.md. If something is genuinely needed but missing, add it to Schema.md first, then write the code — do not implicitly define new contracts inside implementation code.

## 1a. App Naming Rule
The app's official name is **RituGrid**. It must be used as the UI header/title, the browser tab title, and in any README/repo/pitch reference to the project name. Never substitute the generic descriptor ("Hybrid AI–NWP Multi-Model Forecast Blending System") as the user-facing name — that string is a subtitle/description only (see Design.md §0). Do not generate variant spellings or abbreviations.

## 2. Hard Scope Boundaries (do not violate)
- **Do not build a new weather prediction model.** This project blends existing model outputs only (PRD.md §1).
- **Do not expand the bounding box or variable list.** Fixed at Schema.md §1: Lat 5–35°N, Lon 65–100°E; variables `t2m` and `tp` only.
- **Do not add authentication, billing, multi-tenancy, or admin panels.** Out of scope (PRD.md §3).
- **Do not fetch live/real-time data.** Use only pre-downloaded historical files (TRD.md §6).
- **Do not substitute datasets or libraries not listed in TRD.md §1–2** without explicitly stating: *"This is not in TRD.md — confirm before I proceed."*

## 3. Extreme Preservation Rule (non-negotiable)
Any blending/training code must NOT use plain MSE/L2 loss as the final loss function. It must use a quantile/weighted loss that penalizes under-prediction of extreme values (TRD.md §4). If the coding tool generates a model using plain MSE, it must be treated as a draft/baseline only and explicitly flagged as needing the extreme-preserving loss before it is considered done.

## 4. Regridding Rule
Never interpolate precipitation data with simple bilinear or nearest-neighbor methods. Always use conservative remapping (`xesmf` conservative method, or an equivalent mass-conserving method) per TRD.md §3. If `xesmf` fails to install (common on Windows/some judge machines), fall back to `xarray-regrid` conservative method — do not silently switch to bilinear as a "quick fix."

## 5. Grid & Schema Consistency Rule
Every `.nc` file the code produces must match the dimension/coordinate schema in Schema.md §3 exactly (same lat/lon step, same dim order/names). Before writing any new data-processing function, check Schema.md §2–4 for the expected file path, naming convention, and column/variable names. Do not rename fields for convenience (e.g., `temp` instead of `t2m`) — this breaks downstream code that expects the schema names.

## 6. Fallback Logic Rule
The "simulate model dropout" feature (AppFlow.md §2, Schema.md §6 `/simulate-dropout`) must be implemented as a **serving-time/inference-time rule** (re-normalize remaining weights to sum to 1), not baked into the trained model. The trained model should never assume all source models are always present.

## 7. Judge Q&A Grounding (answers must match actual implementation)
When building any explanatory copy (pitch text, tooltips, README), the answers must stay consistent with what's actually implemented — do not describe a Transformer/ST-GNN model in the pitch if the shipped model is the scikit-learn baseline. Use these as the grounded talking points, and update them if implementation changes:

| Judge Question | Answer (update if implementation changes) |
|---|---|
| How do you prevent smoothing of extremes? | Custom quantile/weighted loss penalizing under-prediction of extreme truth values; regime-aware weight shifts toward NWP models during detected extreme events. |
| How do you align mismatched grids? | Conservative remapping (mass/energy-conserving), not naive bilinear interpolation. |
| Why not just use Bayesian Model Averaging? | BMA uses static/slowly-updating broad-area weights; this system predicts adaptive, cell-level weights conditioned on lead time, season, and current disagreement between models. |
| What happens if a model feed goes down? | Serving layer detects missing input and re-normalizes remaining model weights live — demoed via the dropout-simulation toggle. |

## 8. Code Generation Conventions
- Python: PEP8, type hints on function signatures, docstrings on all data-processing and model functions.
- No hardcoded absolute file paths — use the `/data/...` relative structure from Schema.md §2 via a config/constants file.
- No print-based debugging left in "final" code — use logging.
- Every notebook/script that produces an output file listed in Schema.md §2 must write to the exact path specified there.
- Do not introduce a database (Postgres/Supabase/etc.) unless the Tracker.md Decisions Log records that choice explicitly — default is filesystem + optional SQLite only (TRD.md §1).

## 9. When the Coding Tool Is Unsure
If a prompt/request is ambiguous or seems to require something outside these documents, the tool should:
1. State the ambiguity explicitly.
2. Propose the option that best fits the existing Schema.md/TRD.md constraints.
3. Not silently invent a new dataset, endpoint, library, or file format to "make it work."

## 10. Definition of Done (per feature)
A feature is only "Done" (per Tracker.md) when:
- It matches its schema/contract exactly (Schema.md).
- It doesn't violate any rule in this file.
- It's been checked against the relevant AppFlow.md flow end-to-end (not just unit-tested in isolation).
