import React, { useEffect, useRef, useState } from 'react';
import type { WeatherVariable, ForecastGrid } from '../types';
import { fetchForecast } from '../services/api';
import { interpolateColor } from '../utils/colormaps';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

interface MapViewProps {
  activeDate: string;
  activeLeadTime: number;
  activeVar: WeatherVariable;
}

export const MapView: React.FC<MapViewProps> = ({
  activeDate,
  activeLeadTime,
  activeVar,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const canvasLayerRef = useRef<L.ImageOverlay | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('india');
  const [activeModel, setActiveModel] = useState<'blended' | 'gfs' | 'ncum' | 'graphcast'>('blended');
  const [forecast, setForecast] = useState<ForecastGrid | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [22.0, 79.0],
      zoom: 5,
      zoomControl: false,
    });

    // Sleek Esri Dark Gray tiles (100% free, zero watermark)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri, &copy; OpenStreetMap contributors',
      maxZoom: 16,
    }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      attribution: '',
      maxZoom: 16,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Fetch forecast data
  useEffect(() => {
    fetchForecast(activeDate, activeLeadTime, activeVar)
      .then(setForecast)
      .catch(() => null);
  }, [activeDate, activeLeadTime, activeVar]);

  // Render Canvas Raster
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !forecast) return;

    if (canvasLayerRef.current) {
      map.removeLayer(canvasLayerRef.current);
      canvasLayerRef.current = null;
    }

    const { lat, lon, values } = forecast.grid;
    if (!lat?.length || !lon?.length || !values?.length) return;

    const south = Math.min(...lat);
    const north = Math.max(...lat);
    const west = Math.min(...lon);
    const east = Math.max(...lon);
    const bounds = L.latLngBounds([south, west], [north, east]);

    const rows = lat.length;
    const cols = lon.length;
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(cols, rows);

    for (let r = 0; r < rows; r++) {
      const latIdx = lat[0] > lat[rows - 1] ? r : rows - 1 - r;
      for (let c = 0; c < cols; c++) {
        const val = values[latIdx]?.[c] ?? 0;
        const rgba = interpolateColor(activeVar, val);
        const idx = (r * cols + c) * 4;
        imgData.data[idx] = rgba[0];
        imgData.data[idx + 1] = rgba[1];
        imgData.data[idx + 2] = rgba[2];
        imgData.data[idx + 3] = Math.round(rgba[3] * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const imageOverlay = L.imageOverlay(canvas.toDataURL(), bounds, {
      opacity: 0.82,
    });
    imageOverlay.addTo(map);
    canvasLayerRef.current = imageOverlay;
  }, [forecast, activeVar]);

  const handleRegionChange = (reg: string) => {
    setSelectedRegion(reg);
    const map = mapInstance.current;
    if (!map) return;
    if (reg === 'india') map.setView([22.0, 79.0], 5);
    if (reg === 'north') map.setView([31.0, 77.0], 6);
    if (reg === 'south') map.setView([12.0, 77.0], 6);
    if (reg === 'east') map.setView([25.0, 88.0], 6);
    if (reg === 'west') map.setView([19.0, 72.0], 6);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 65px)' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Region Selector */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: '1.5rem',
        left: '1.5rem',
        padding: '1.25rem',
        zIndex: 900,
        minWidth: '240px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
          <MapPin size={14} /> Focus Region
        </div>
        <select
          value={selectedRegion}
          onChange={(e) => handleRegionChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.6rem 0.85rem',
            borderRadius: '0.5rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border-subtle)',
            color: 'white',
            fontFamily: 'inherit',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="india" style={{ background: '#0f172a' }}>🇮🇳 Indian Subcontinent (All)</option>
          <option value="north" style={{ background: '#0f172a' }}>🏔️ Northern Region (Himalayas)</option>
          <option value="south" style={{ background: '#0f172a' }}>🌴 Southern Peninsula</option>
          <option value="east" style={{ background: '#0f172a' }}>🌊 Eastern / Bay of Bengal</option>
          <option value="west" style={{ background: '#0f172a' }}>⛵ Western / Arabian Sea</option>
        </select>
      </div>

      {/* Floating Model Switcher */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: '1.5rem',
        right: '1.5rem',
        padding: '0.5rem',
        zIndex: 900,
        display: 'flex',
        gap: '0.4rem',
      }}>
        {[
          { id: 'blended', label: 'RituGrid Hybrid', color: '#38bdf8' },
          { id: 'gfs', label: 'NOAA GFS', color: '#60a5fa' },
          { id: 'ncum', label: 'NCUM / GEFS', color: '#34d399' },
          { id: 'graphcast', label: 'GraphCast AI', color: '#c084fc' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setActiveModel(m.id as any)}
            className={`control-pill ${activeModel === m.id ? 'active' : ''}`}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Legend Panel in bottom left */}
      <div className="glass-panel" style={{
        position: 'absolute',
        bottom: '1.5rem',
        left: '1.5rem',
        padding: '1rem 1.25rem',
        zIndex: 900,
        minWidth: '220px',
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
          {activeVar === 'tp' ? 'TOTAL PRECIPITATION (MM/DAY)' 
            : activeVar === 't2m' ? 'TEMPERATURE (°C / KELVIN)' 
            : '10M WIND SPEED (M/S)'}
        </div>
        <div>
          <div style={{
            height: '10px',
            borderRadius: '5px',
            background: activeVar === 'tp'
              ? 'linear-gradient(to right, #0f172a, #38bdf8, #2563eb, #f59e0b, #ef4444, #a855f7)'
              : activeVar === 't2m'
              ? 'linear-gradient(to right, #3b82f6, #2dd4bf, #22c55e, #facc15, #f97316, #ef4444, #9f1239)'
              : 'linear-gradient(to right, #0f172a, #38bdf8, #22c55e, #eab308, #ef4444, #a855f7)',
            marginBottom: '0.4rem',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            {activeVar === 'tp' && (
              <>
                <span>0 mm</span>
                <span>15 mm</span>
                <span style={{ color: '#f59e0b' }}>64.5 (IMD Heavy)</span>
                <span style={{ color: '#ef4444' }}>150+ mm</span>
              </>
            )}
            {activeVar === 't2m' && (
              <>
                <span style={{ color: '#60a5fa' }}>5°C (278K)</span>
                <span>20°C</span>
                <span>30°C</span>
                <span style={{ color: '#ef4444' }}>41°C+ (Heatwave)</span>
              </>
            )}
            {activeVar === 'ws10' && (
              <>
                <span>0 m/s</span>
                <span>8 m/s</span>
                <span style={{ color: '#f59e0b' }}>14 (50 km/h)</span>
                <span style={{ color: '#ef4444' }}>28+ m/s</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
