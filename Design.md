# Design — UI/UX Guidelines

## 0. Branding
- **App name: RituGrid.**
- Use "RituGrid" as the main header/title in the UI (top of the Overview/landing screen), as the browser tab title (`<title>RituGrid</title>` for React, or `st.set_page_config(page_title="RituGrid")` for Streamlit), and in the repo README/pitch materials.
- The descriptive subtitle ("Hybrid AI–NWP Multi-Model Forecast Blending System") can appear as a smaller tagline directly under the header, but "RituGrid" is always the dominant, larger text.
- Do not invent alternate names, abbreviations, or stylizations (e.g., "Ritu Grid", "RG Dashboard") anywhere in code or copy.

## 1. Design Intent
The dashboard must look like a **professional meteorological command center**, not a generic data-science demo. Judges are domain scientists — clarity and operational credibility matter more than flashy animation. Every screen should answer, at a glance: *"What is the forecast, and can I trust it?"*

## 2. Layout Principles
- **Map-first layout.** The forecast map is the largest element on screen at all times. Never bury it below charts or text.
- **Split view for comparison.** Where possible, show the blended forecast and the weight-distribution map either side-by-side or as a toggle on the same map instance — do not force users to navigate to a separate page to compare them.
- **Persistent context bar.** Date, variable (Temp/Rainfall), and region should always be visible/editable, not hidden in a menu.
- **Sidebar for scores, not popups.** Skill scores (RMSE/ACC) live in a fixed sidebar/panel, always visible when a date is selected — this is a judged deliverable and must never require extra clicks to find.

## 3. Color System
- **Temperature layer:** sequential blue → yellow → red scale (cold to hot), colorblind-safe (e.g., matplotlib `RdYlBu_r` or similar).
- **Rainfall layer:** sequential white/light-blue → dark-blue/purple scale, with a distinct high-saturation color reserved for extreme thresholds (see §5).
- **Weight-distribution overlay:** use a **categorical** color per source model (e.g., Model A = teal, Model B = orange, Model C = purple) so "which model dominates this region" is readable at a glance — do not use a continuous colormap here, it will be unreadable.
- **UI chrome (backgrounds, panels, text):** neutral dark-slate or neutral-white theme — avoid bright/playful colors that clash with the scientific data layers. Pick one theme and keep it consistent; do not mix light and dark panels.

## 4. Typography & Components
- Use a clean sans-serif (system font stack is fine — Inter, Segoe UI, or Streamlit/Leaflet defaults). No decorative fonts.
- Numeric skill scores should be shown as **big, legible numbers with a delta indicator** (e.g., "Blended RMSE: 1.8°C ▼ vs GFS: 2.6°C") — the *comparison* is the point, not the raw number alone.
- Use a legend on every map layer, always visible, never a hover-only tooltip for the core color scale.

## 5. Extreme-Event Emphasis (critical for judging)
Since the core innovation claim is "we don't smooth out extremes," the UI must visually prove this:
- Add a distinct visual marker (e.g., hatched pattern or bright outline) on cells where an extreme was detected and preserved in the blended output.
- Provide a before/after or blended-vs-naive-average comparison view if time allows — this single visual is likely the strongest judge-facing proof point in the whole project.

## 6. Explainability Panel Design
- Triggered by clicking a grid cell.
- Shows: a small bar chart of each source model's raw value + its assigned weight, plus a one-line plain-English "regime" label (e.g., "Extreme rainfall regime detected — NWP model weighted higher due to historical skill in convective events").
- Keep it compact (a side drawer or modal), not a full page navigation — it should not interrupt map browsing.

## 7. Fallback/Stress-Test UI
- A clearly labeled toggle/switch, visually distinct (e.g., red-accented "Simulate Model Outage" control), separate from normal filters — this is a deliberate demo feature for judges, so it should not look like an accidental setting.
- When triggered, briefly highlight which weights changed (e.g., a short transition animation or before/after value labels) so the redistribution is visibly obvious, not silent.

## 8. What to Avoid
- Do not add unrelated dashboard chrome (login screens, user profiles, settings pages) — out of scope per PRD.md.
- Do not use 3D globe visualizations or heavy WebGL unless the team has strong front-end bandwidth — it adds risk without judging benefit at MVP stage.
- Do not let the weight map and forecast map use visually similar color scales — they must be immediately distinguishable from each other.
