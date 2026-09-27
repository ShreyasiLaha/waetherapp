import React, { useEffect, useRef, useState } from 'react';
import type { WeatherVariable } from '../types';
import L from 'leaflet';
import { Layers, MapPin, ZoomIn } from 'lucide-react';

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
  const [selectedRegion, setSelectedRegion] = useState('india');
  const [activeModel, setActiveModel] = useState<'blended' | 'gfs' | 'ncum' | 'graphcast'>('blended');

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
    </div>
  );
};
