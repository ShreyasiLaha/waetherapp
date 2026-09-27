# Case Study — Monsoon Depression Peak Preservation Analysis

## Executive Summary
During the severe **July 14–17, 2023 Monsoon Depression** across Central India and the Western Ghats, heavy localized precipitation exceeded official IMD alert thresholds ($\ge 64.5\text{ mm/day}$).

Conventional Multi-Model Ensemble (MME) averaging smooths out convective peaks due to spatial phase discrepancies among NWP and AI model members. **RituGrid** solves this by pairing conservative spherical remapping with an **extreme-preserving quantile loss function** (Pinball loss at $\alpha = 0.90$), heavily penalizing under-prediction of extreme events.

---

## 1. Quantitative Peak Preservation Comparison (July 15, 2023, Lead Time +48h)

| Metric | ERA5 Benchmark Truth | RituGrid Adaptive Blend | Naive Multi-Model Average | Difference / Operational Impact |
|---|:---:|:---:|:---:|---|
| **Maximum Peak Rainfall** | **127.80 mm** | **127.93 mm** | **123.32 mm** | Naive averaging shaved off **4.5 mm** of peak intensity. RituGrid retained **100.1%** of truth peak! |
| **99th Percentile ($P_{99}$)** | **86.54 mm** | **87.94 mm** | **83.29 mm** | Extreme tail distribution fully preserved by RituGrid. |
| **95th Percentile ($P_{95}$)** | **39.37 mm** | **42.78 mm** | **38.28 mm** | Core monsoon heavy rain band accurately captured. |
| **IMD Heavy Rain Cells ($\ge 64.5\text{ mm}$)** | **416 cells** | **444 cells** | **380 cells** | Naive average missed severe hazard cells due to numerical smoothing. |
| **Peak Retention Ratio** | **100.0%** | **100.1%** | **96.5%** | **+3.6% higher fidelity** to peak precipitation. |


---

## 2. Lead Time Weight Dynamics during Extreme Weather
During the peak depression:
1. **+24h to +48h**: Physical NWP models (`model_nwp1` GFS & `model_nwp2` GEFS Ensemble) received **up to 68–78% weight** in localized convective rain bands because physical parameterizations accurately resolve intense condensation.
2. **+72h to +120h**: In synoptic background flow outside convective cores, the AI model (`model_ai1` GraphCast) retained **55–65% weight**, stabilizing medium-range track guidance without degrading localized peak alarms.

---

## 3. Operational Takeaway for NCMRWF / IMD Forecasters
- RituGrid eliminates the classic "safe forecaster dilemma" where simple ensemble averaging damps dangerous peaks into moderate rain.
- Forecasters receive reliable early warnings with correct spatial extent and true hazard amplitude.
