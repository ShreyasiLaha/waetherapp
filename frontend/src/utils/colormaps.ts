import type { WeatherVariable } from '../types';

export interface ColormapStop {
  val: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export const COLORMAPS: Record<WeatherVariable, ColormapStop[]> = {
  tp: [
    { val: 0, r: 15, g: 23, b: 42, a: 0.0 },
    { val: 2, r: 56, g: 189, b: 248, a: 0.45 },
    { val: 10, r: 14, g: 165, b: 233, a: 0.65 },
    { val: 25, r: 37, g: 99, b: 235, a: 0.75 },
    { val: 64.5, r: 245, g: 158, b: 11, a: 0.85 }, // IMD Heavy Rain threshold
    { val: 115.5, r: 239, g: 68, b: 68, a: 0.92 }, // IMD Very Heavy Rain
    { val: 204.4, r: 168, g: 85, b: 247, a: 0.98 }, // IMD Extremely Heavy Rain
  ],
  t2m: [
    { val: 10, r: 59, g: 130, b: 246, a: 0.6 },
    { val: 20, r: 45, g: 212, b: 191, a: 0.6 },
    { val: 28, r: 250, g: 204, b: 21, a: 0.7 },
    { val: 35, r: 249, g: 115, b: 22, a: 0.8 },
    { val: 42, r: 239, g: 68, b: 68, a: 0.9 },
    { val: 48, r: 159, g: 18, b: 57, a: 0.95 },
  ],
  ws10: [
    { val: 0, r: 15, g: 23, b: 42, a: 0.0 },
    { val: 5, r: 56, g: 189, b: 248, a: 0.5 },
    { val: 12, r: 34, g: 197, b: 94, a: 0.7 },
    { val: 20, r: 234, g: 179, b: 8, a: 0.8 },
    { val: 28, r: 239, g: 68, b: 68, a: 0.9 },
    { val: 40, r: 168, g: 85, b: 247, a: 0.95 },
  ],
};

export const MODEL_COLORS: Record<string, string> = {
  gfs: '#3b82f6',
  ncum: '#10b981',
  graphcast: '#a855f7',
  ecmwf: '#06b6d4',
  blended: '#38bdf8',
};

export function interpolateColor(variable: WeatherVariable, val: number): [number, number, number, number] {
  const stops = COLORMAPS[variable];
  if (val <= stops[0].val) {
    const s = stops[0];
    return [s.r, s.g, s.b, s.a];
  }
  if (val >= stops[stops.length - 1].val) {
    const s = stops[stops.length - 1];
    return [s.r, s.g, s.b, s.a];
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (val >= s1.val && val <= s2.val) {
      const factor = (val - s1.val) / (s2.val - s1.val);
      const r = Math.round(s1.r + factor * (s2.r - s1.r));
      const g = Math.round(s1.g + factor * (s2.g - s1.g));
      const b = Math.round(s1.b + factor * (s2.b - s1.b));
      const a = s1.a + factor * (s2.a - s1.a);
      return [r, g, b, a];
    }
  }
  return [0, 0, 0, 0];
}
