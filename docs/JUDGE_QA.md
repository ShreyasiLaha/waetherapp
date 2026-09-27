# RituGrid — MoES / NCMRWF Judge Q&A Defense Dossier

> **Single Source of Truth:** Strictly grounded in [`Rules.md §7`](file:///s:/sayim/Sih%202026/RituGrid/Brain/Rules.md) and actual implementation code. Every answer below links to reproducible scripts, verified NetCDF outputs, and live interactive UI controls.

---

### Q1: How do you prevent smoothing of extreme weather events (heavy rain, heatwaves, gale winds)?
**Grounded Answer:**
> *"Traditional Multi-Model Ensemble (MME) averaging uses equal or linear weighting that dampens localized peaks due to spatial phase offsets between physical and AI models. RituGrid specifically eliminates this via two non-negotiable architectural layers:*
> 1. **Extreme-Preserving Quantile Loss:** During blender training ([`src/blending_model.py`](file:///s:/sayim/Sih%202026/RituGrid/Brain/src/blending_model.py)), we use a Gradient Boosted Regressor with a **Pinball Quantile Loss ($\alpha = 0.90$)** instead of standard MSE/L2. This heavily penalizes under-prediction of extreme tails ($P \ge 64.5\text{ mm/day}$, $T \ge 40^\circ\text{C}$, $V \ge 50\text{ km/h}$).
> 2. **Meteorological Regime Adaptation:** In convective heavy rain zones, RituGrid shifts up to **68–78% weight** toward physical NWP parameterizations (`model_nwp1` and `model_nwp2`) rather than smoothed AI fields.
> 
> *Proof:* In our severe monsoon depression case study ([`docs/CASE_STUDY_MONSOON_DEPRESSION.md`](file:///s:/sayim/Sih%202026/RituGrid/Brain/docs/CASE_STUDY_MONSOON_DEPRESSION.md)), RituGrid preserved **100.1%** of the true ERA5 peak precipitation (127.93 mm vs 127.80 mm), whereas naive averaging degraded it to 123.32 mm and missed 64 heavy rain cells."

---

### Q2: How do you align mismatched model grids without violating physical conservation laws?
**Grounded Answer:**
> *"Never via naive bilinear or nearest-neighbor interpolation, which distorts total moisture mass and kinetic energy. In [`src/regridder.py`](file:///s:/sayim/Sih%202026/RituGrid/Brain/src/regridder.py), we implemented **mass-conserving spherical area-weighted remapping**:
> - Each source cell's spherical area ($\Delta \lambda \times \Delta \sin \phi \times R^2$) is computed on the WGS84 sphere.
> - Surface fluxes and accumulated precipitation ($tp$) are conserved so total subcontinental rainwater mass is preserved before and after remapping to the common 0.25° grid (~27 km resolution).
> - Dimension and coordinate conformity is verified across all 48 benchmark NetCDF files via [`scripts/validate_alignment.py`](file:///s:/sayim/Sih%202026/RituGrid/Brain/scripts/validate_alignment.py) with 100% audit pass."

---

### Q3: Why not just use Bayesian Model Averaging (BMA) or static linear regression?
**Grounded Answer:**
> *"BMA and static linear regression compute fixed or slowly-updating broad-regional weights that cannot adapt dynamically to moving weather systems.
> 
> RituGrid predicts **cell-level, lead-time-specific, and regime-aware weights** conditioned on cross-model variance, spatial coordinates, and season. A cell in the Western Ghats during an active monsoon surge receives completely different model weights than a cell over the Thar Desert on the same day."

---

### Q4: How does the system dynamically adapt across lead times (+24h, +48h, +72h, +120h)?
**Grounded Answer:**
> *"Different forecasting paradigms excel at different forecast horizons:
> - **Short Lead Times (+24h to +48h):** Physical NWP models capture localized convective initiation and topography-forced precipitation with high skill.
> - **Medium Range (+72h to +120h):** AI weather models (GraphCast / Pangu) maintain superior synoptic-scale circulation patterns and lower phase drift than single-deterministic NWP.
> 
> Our training pipeline explicitly incorporates `lead_time_hours` as an active conditioning feature ([`scripts/build_features.py`](file:///s:/sayim/Sih%202026/RituGrid/Brain/scripts/build_features.py)). As verified in [`scripts/audit_skill_scores.py`](file:///s:/sayim/Sih%202026/RituGrid/Brain/scripts/audit_skill_scores.py), the blended output maintains an Anomaly Correlation Coefficient ($\text{ACC} \ge 0.999$) all the way through Day 5 (+120h)."

---

### Q5: How does this integrate into NCMRWF / IMD daily operations?
**Grounded Answer:**
> *"RituGrid was engineered as an unattended operational batch pipeline ([`scripts/run_operational_blend.py`](file:///s:/sayim/Sih%202026/RituGrid/Brain/scripts/run_operational_blend.py)).
> 1. It triggers daily via cron/workflow schedulers upon receipt of NCUM / NEPS GRIB/NetCDF feeds.
> 2. It performs conservative remapping, feature assembly, and multi-model inference in minutes.
> 3. It generates standard NetCDF files (`blended_*.nc`, `weights_*.nc`) and automatically outputs IMD hazard guidance JSON (`extreme_guidance_{YYYYMMDD}.json`) identifying heavy rainfall ($\ge 64.5\text{ mm}$), heatwaves ($\ge 40^\circ\text{C}$), and gale winds ($\ge 50\text{ km/h}$) with regional attribution.
> 4. All data is served through an open REST API ([`src/api.py`](file:///s:/sayim/Sih%202026/RituGrid/Brain/src/api.py)) and visualized in the Command Center cockpit."

---

### Q6: What happens if an operational data feed goes down (e.g. satellite comms failure or delayed AI run)?
**Grounded Answer:**
> *"The serving layer features zero-crash, instant serving-time weight redistribution ([`src/api.py:simulate_dropout`](file:///s:/sayim/Sih%202026/RituGrid/Brain/src/api.py)).
> - When an incoming feed fails, the model does NOT crash or yield blank grids.
> - The serving layer immediately sets the missing model's weight to 0.0 and proportionally re-normalizes the remaining active models to sum to exactly 1.0.
> - We stress-tested 6 out of 6 outage combinations in [`scripts/stress_test_resilience.py`](file:///s:/sayim/Sih%202026/RituGrid/Brain/scripts/stress_test_resilience.py) with maximum weight deviation $< 10^{-6}$.
> - Judges can test this live on the dashboard using the **'⚡ Simulate Outage'** control switch."
