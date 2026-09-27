import type { ForecastGrid, WeightsData, IMDAlert, WeatherVariable } from '../types';
import { normalizeAlert } from '../types';

const API_BASE = ''; // Uses Vite proxy in development, or relative paths in production

export async function fetchHealth(): Promise<{ status: string; available_dates: number; models_loaded: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function fetchDates(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/dates`);
    if (!res.ok) return ['20230715', '20230714', '20230716', '20230717'];
    const data = await res.json();
    return data.dates?.length ? data.dates : ['20230715', '20230714', '20230716', '20230717'];
  } catch {
    return ['20230715', '20230714', '20230716', '20230717'];
  }
}

export async function fetchForecast(date: string, leadTime: number, variable: WeatherVariable): Promise<ForecastGrid> {
  const cleanDate = date.replace(/-/g, '');
  const res = await fetch(`${API_BASE}/forecast?date=${cleanDate}&lead_time=${leadTime}&variable=${variable}`);
  if (!res.ok) throw new Error(`Forecast request failed (${res.status})`);
  return res.json();
}

export async function fetchWeights(date: string, leadTime: number, variable: WeatherVariable): Promise<WeightsData> {
  const cleanDate = date.replace(/-/g, '');
  const res = await fetch(`${API_BASE}/weights?date=${cleanDate}&lead_time=${leadTime}&variable=${variable}`);
  if (!res.ok) throw new Error(`Weights request failed (${res.status})`);
  return res.json();
}

export async function fetchAlerts(date: string, leadTime?: number): Promise<IMDAlert[]> {
  try {
    const cleanDate = date.replace(/-/g, '');
    const url = leadTime != null
      ? `${API_BASE}/extreme-guidance?date=${cleanDate}&lead_time=${leadTime}`
      : `${API_BASE}/extreme-guidance?date=${cleanDate}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const rawAlerts = data.alerts || [];
    return rawAlerts.map(normalizeAlert);
  } catch {
    return [];
  }
}

export interface DynamicSkillRecord {
  date: string;
  variable: string;
  lead_time_hours: number;
  scores: {
    blended: { rmse: number; acc: number };
    model_nwp1: { rmse: number; acc: number };
    model_nwp2: { rmse: number; acc: number };
    model_ai1: { rmse: number; acc: number };
  };
}

export async function fetchSkillScores(date?: string, leadTime?: number, variable?: WeatherVariable): Promise<DynamicSkillRecord[]> {
  try {
    const params = new URLSearchParams();
    if (date) params.append('date', date.replace(/-/g, ''));
    if (leadTime != null) params.append('lead_time', String(leadTime));
    if (variable) params.append('variable', variable);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/skill-scores${query}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.records || [];
  } catch {
    return [];
  }
}

export async function simulateDropout(
  date: string,
  leadTime: number,
  variable: WeatherVariable,
  disabledModels: string[]
): Promise<WeightsData> {
  const cleanDate = date.replace(/-/g, '');
  const res = await fetch(`${API_BASE}/simulate-dropout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: cleanDate,
      lead_time: leadTime,
      variable,
      disabled_models: disabledModels,
    }),
  });
  if (!res.ok) throw new Error('Dropout simulation failed');
  return res.json();
}
