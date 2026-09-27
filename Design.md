# Design — UI/UX Guidelines

## 0. Branding
- **App name: RituGrid.**
- Use "RituGrid" as the main header/title in the UI (top of the Overview/landing screen), as the browser tab title (`<title>RituGrid</title>` for React, or `st.set_page_config(page_title="RituGrid")` for Streamlit), and in the repo README/pitch materials.
- The descriptive subtitle ("Hybrid AI–NWP Multi-Model Forecast Blending System | MoES / NCMRWF") can appear as a smaller tagline directly under the header, but "RituGrid" is always the dominant, larger text.
- Do not invent alternate names, abbreviations, or stylizations (e.g., "Ritu Grid", "RG Dashboard") anywhere in code or copy.

## 1. Design Intent
The dashboard must look like a **professional meteorological command center** designed for NCMRWF/IMD forecasters, not a generic data-science demo. Judges are domain scientists — clarity and operational credibility matter more than flashy animation. Every screen should answer, at a glance: *"What is the blended forecast, which model is driving it at this lead time, and are extreme hazards protected from smoothing?"*

## 2. Layout Principles
- **Map-first layout.** The forecast map is the largest element on screen at all times. Never bury it below charts or text.
- **Persistent context bar.** Top control bar must continuously display:
  - Forecast Initialization Date
  - **Lead Time Horizon Toggle:** `+24h (Day 1)`, `+48h (Day 2)`, `+72h (Day 3)`, `+120h (Day 5)`
  - **Variable Toggle:** Rainfall (`tp`), Temperature (`t2m`), Wind Speed (`ws10`)
- **Split / Overlay view for comparison.** Toggle easily between the Blended Forecast map and the Model Weight Distribution map on the same viewport.
- **Sidebar for scores, not popups.** Skill scores (RMSE/ACC) live in a fixed sidebar/panel, comparing Blended vs each individual model at the chosen lead time.
- **Top Extreme Guidance Banner.** Prominently flags active IMD-threshold hazard zones across the subcontinent.

## 3. Color System
- **Temperature layer:** sequential blue → yellow → red scale (cold to hot), colorblind-safe (e.g., matplotlib `RdYlBu_r` or similar).
- **Rainfall layer:** sequential white/light-blue → dark-blue/navy scale, with deep purple/magenta reserved for extreme precipitation thresholds (>64.5 mm/day).
- **Wind Speed layer:** sequential mint-green → cyan → amber → vibrant crimson scale for gale-force winds (>50 km/h).
- **Weight-distribution overlay:** use a **categorical** palette per source model (e.g., GFS/NWP1 = Amber/Orange, Ensemble/NWP2 = Cyan, AI/GraphCast = Violet) so dominant model territory is instantly recognizable.
- **UI chrome (backgrounds, panels, text):** sleek dark-slate meteorological theme (`#0B0F19` background, `#1E293B` cards, `#38BDF8` accents) with crisp contrast for high scientific legibility.

## 4. Typography & Components
- Clean sans-serif font stack (Inter, Segoe UI, Roboto). No playful or decorative fonts.
- Numeric skill scores should be shown as **big, legible numbers with a delta indicator** (e.g., "Blended RMSE: 1.8°C ▼ -31% vs GFS: 2.6°C").
- Every map layer must feature a fixed, readable legend with units clearly stated (`mm/day`, `°C`, `km/h` or `m/s`).

## 5. Extreme-Event Emphasis & Guidance (Critical for Judging)
Since the core MoES requirement is "improved signals for heavy rainfall, heat wave and high-wind events without smoothing," the UI must visually prove this:
- **Hazard Outlines / Stippling:** Grid cells crossing official IMD alert thresholds are highlighted with bold contouring or stippling:
  - *Heavy Rainfall:* $\ge 64.5\text{ mm/day}$
  - *Heat Wave:* $T_{\max} \ge 40^\circ\text{C}$ (plains) with positive anomaly
  - *High Wind / Gale:* $\ge 50\text{ km/h}$
- **Extreme Preservation Callout:** A toggleable comparative mini-inspector: "Blended vs Naive Multi-Model Average" showing that RituGrid preserved the peak where simple averaging suppressed it.

## 6. Explainability Panel Design
- Triggered by clicking any grid cell on the map.
- Displays:
  1. Bar chart of raw values from each input model vs the blended output value.
  2. Donut/stacked chart of assigned weights ($w_1 + w_2 + w_3 = 1.0$).
  3. Meteorological Regime Badge (e.g., *"Convective Heavy Rain: NWP physics weighted 68% due to higher skill in localized precipitation"*, or *"Day-5 Synoptic Flow: AI model weighted 58% due to superior medium-range pattern skill"*).

## 7. Operational Resilience / Stress-Test UI
- A visually distinct "Simulate Model Feed Outage" control switch.
- When toggled (e.g., dropping GraphCast or GFS), weights immediately redistribute proportionally across remaining active sources with a clear notification: *"AI feed lost — weights smoothly re-allocated to NWP. Zero forecast blackout."*

## 8. What to Avoid
- Do not add consumer weather app bloat (7-day icons, umbrella reminders, login screens).
- Do not use 3D globe visualizations or heavy WebGL that could lag on judge laptops.
- Never use the same color palette for model weights and meteorological variables.
