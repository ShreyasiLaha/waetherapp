export type ActiveView = 
  | 'overview' 
  | 'operations' 
  | 'map' 
  | 'alerts' 
  | 'comparison' 
  | 'weights' 
  | 'analysis' 
  | 'skill' 
  | 'report';

export type WeatherVariable = 'tp' | 't2m' | 'ws10';

export interface ForecastGrid {
  date: string;
  lead_time_hours: number;
  variable: string;
  units: string;
  grid: {
    lat: number[];
    lon: number[];
    values: number[][];
  };
}

export interface WeightsData {
  date: string;
  lead_time_hours: number;
  variable: string;
  models: string[];
  disabled_models?: string[];
  active_models?: string[];
  grid: {
    lat: number[];
    lon: number[];
    dominant_model: string[][];
    weights: {
      [model: string]: (number | null)[][];
    };
  };
}

export interface RawBackendAlert {
  type: string;
  variable: string;
  lead_time_hours: number;
  threshold: string;
  max_value: number;
  max_value_unit: string;
  region: string;
  centroid_lat?: number;
  centroid_lon?: number;
  affected_cells: number;
  dominant_model_used?: string;
  severity?: 'RED' | 'ORANGE' | 'YELLOW';
}

export interface IMDAlert {
  hazard_type: string;
  severity: 'RED' | 'ORANGE' | 'YELLOW';
  lead_time_hours: number;
  affected_region: string;
  peak_value: number;
  threshold_value: string;
  units: string;
  affected_grid_cells: number;
  bulletin_text: string;
  model_divergence_flag: boolean;
  divergence_detail?: string;
}

export function normalizeAlert(raw: any): IMDAlert {
  const peak = raw.max_value ?? raw.peak_value ?? 0;
  const varType = raw.type || raw.hazard_type || 'severe_weather';
  const unit = raw.max_value_unit || raw.units || (raw.variable === 'tp' ? 'mm/day' : 'km/h');
  
  let sev: 'RED' | 'ORANGE' | 'YELLOW' = raw.severity || 'ORANGE';
  if (!raw.severity) {
    if (raw.variable === 'tp' || varType.includes('rain')) {
      if (peak >= 115.5) sev = 'RED';
      else if (peak >= 64.5) sev = 'ORANGE';
      else sev = 'YELLOW';
    } else if (raw.variable === 'ws10' || varType.includes('wind')) {
      if (peak >= 65) sev = 'RED';
      else if (peak >= 50) sev = 'ORANGE';
      else sev = 'YELLOW';
    }
  }

  const name = varType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  return {
    hazard_type: name,
    severity: sev,
    lead_time_hours: raw.lead_time_hours ?? 48,
    affected_region: raw.region || raw.affected_region || 'Indian Subcontinent',
    peak_value: peak,
    threshold_value: raw.threshold || raw.threshold_value || 'Threshold Breached',
    units: unit,
    affected_grid_cells: raw.affected_cells || raw.affected_grid_cells || 100,
    bulletin_text: raw.bulletin_text || `IMD Rule-based ${sev} Alert: ${name} reaching peak of ${peak.toFixed(1)} ${unit}. Precautionary disaster management protocols active.`,
    model_divergence_flag: raw.model_divergence_flag ?? false,
    divergence_detail: raw.divergence_detail,
  };
}
