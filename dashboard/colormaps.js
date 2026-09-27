/**
 * RituGrid — Colormaps & Palette Utilities
 * Strictly conforms to Design.md §3 and IMD Meteorological Standards.
 */

const COLORMAPS = {
  // ─── 1. Rainfall (Total Precipitation tp in mm) ───────────────────────────
  // Sequential white/light-blue → dark-blue/navy, deep purple/magenta for >64.5mm
  tp: {
    name: "Precipitation",
    unit: "mm/day",
    threshold: 64.5,
    thresholdLabel: "IMD Heavy Rain (≥64.5 mm)",
    ticks: [0, 5, 15, 35, 64.5, 100, 150],
    getColor: function(val) {
      if (val === null || val === undefined || isNaN(val) || val <= 0.1) {
        return [11, 15, 25, 0]; // Transparent
      }
      if (val < 5.0)   return [186, 230, 253, 180]; // #bae6fd Light sky
      if (val < 15.0)  return [56, 189, 248, 200];  // #38bdf8 Cyan-blue
      if (val < 35.0)  return [2, 132, 199, 220];   // #0284c7 Ocean blue
      if (val < 64.5)  return [30, 58, 138, 235];   // #1e3a8a Deep navy
      if (val < 100.0) return [147, 51, 234, 245];  // #9333ea Vibrant Purple (IMD Heavy Rain)
      return [217, 70, 239, 255];                   // #d946ef Magenta (Extreme Rain)
    },
    getHex: function(val) {
      const c = this.getColor(val);
      return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] / 255})`;
    }
  },

  // ─── 2. Temperature (2m Temperature t2m in °C) ─────────────────────────────
  // Sequential blue → yellow → red scale (cold to hot), >=40°C IMD heatwave
  t2m: {
    name: "Temperature",
    unit: "°C",
    threshold: 40.0,
    thresholdLabel: "IMD Heatwave (≥40.0°C)",
    ticks: [15, 22, 28, 34, 40, 46],
    getColor: function(kelvin) {
      if (kelvin === null || kelvin === undefined || isNaN(kelvin)) {
        return [0, 0, 0, 0];
      }
      // Convert Kelvin to Celsius if >= 150
      const c = kelvin > 150 ? kelvin - 273.15 : kelvin;
      if (c < 18.0) return [59, 130, 246, 200];  // #3b82f6 Cool Blue
      if (c < 25.0) return [20, 184, 166, 210];  // #14b8a6 Teal
      if (c < 32.0) return [234, 179, 8, 220];   // #eab308 Warm Yellow
      if (c < 38.0) return [249, 115, 22, 235];  // #f97316 Vibrant Orange
      if (c < 42.0) return [239, 68, 68, 245];   // #ef4444 Crimson Red (Heatwave)
      return [185, 28, 28, 255];                 // #b91c1c Deep Burgundy (Severe Heatwave)
    },
    getHex: function(kelvin) {
      const c = this.getColor(kelvin);
      return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] / 255})`;
    }
  },

  // ─── 3. Wind Speed (10m Wind ws10 in km/h) ─────────────────────────────────
  // Mint-green → cyan → amber → vibrant crimson for gale-force winds (≥50 km/h)
  ws10: {
    name: "Wind Speed",
    unit: "km/h",
    threshold: 50.0,
    thresholdLabel: "IMD Gale Wind (≥50 km/h)",
    ticks: [0, 15, 30, 45, 50, 65, 80],
    getColor: function(ms) {
      if (ms === null || ms === undefined || isNaN(ms)) {
        return [0, 0, 0, 0];
      }
      // Convert m/s to km/h (1 m/s = 3.6 km/h)
      const kmh = ms * 3.6;
      if (kmh < 15.0) return [110, 231, 183, 180]; // #6ee7b7 Mint Green
      if (kmh < 30.0) return [6, 182, 212, 200];   // #06b6d4 Cyan
      if (kmh < 45.0) return [245, 158, 11, 220];  // #f59e0b Amber
      if (kmh < 50.0) return [249, 115, 22, 235];  // #f97316 Strong Wind
      if (kmh < 65.0) return [239, 68, 68, 245];   // #ef4444 Gale (IMD High Wind)
      return [153, 27, 27, 255];                   // #991b1b Storm Force
    },
    getHex: function(ms) {
      const c = this.getColor(ms);
      return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] / 255})`;
    }
  },

  // ─── 4. Model Categorical Palette (Design.md §3) ───────────────────────────
  models: {
    model_nwp1: {
      id: "model_nwp1",
      name: "NOAA GFS",
      role: "NWP Proxy for NCUM",
      color: "#f59e0b", // Amber / Orange
      rgb: [245, 158, 11],
      badgeClass: "badge-nwp1",
    },
    model_nwp2: {
      id: "model_nwp2",
      name: "GEFS Ensemble",
      role: "Proxy for NEPS Ensemble",
      color: "#06b6d4", // Cyan
      rgb: [6, 182, 212],
      badgeClass: "badge-nwp2",
    },
    model_ai1: {
      id: "model_ai1",
      name: "GraphCast AI",
      role: "AI Deep Weather Model",
      color: "#a855f7", // Violet / Purple
      rgb: [168, 85, 247],
      badgeClass: "badge-ai1",
    },
    getColor: function(dominantModelId, weightVal = 1.0) {
      const m = this[dominantModelId] || this.model_nwp1;
      const alpha = Math.min(255, Math.max(140, Math.round(weightVal * 255)));
      return [m.rgb[0], m.rgb[1], m.rgb[2], alpha];
    }
  }
};
