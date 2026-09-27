import React, { useEffect, useRef, useState } from 'react';
import type { WeatherVariable, ForecastGrid, WeightsData, IMDAlert } from '../types';
import { fetchForecast, fetchWeights, simulateDropout } from '../services/api';
import { interpolateColor, MODEL_COLORS } from '../utils/colormaps';
import L from 'leaflet';
import { 
  Zap, 
  Layers, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  X,
  Sparkles,
  Info
} from 'lucide-react';

interface OperationsViewProps {
  activeDate: string;
  activeLeadTime: number;
  activeVar: WeatherVariable;
  alerts: IMDAlert[];
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  activeDate,
  activeLeadTime,
  activeVar,
  alerts,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const canvasLayerRef = useRef<L.Layer | null>(null);

  const [forecast, setForecast] = useState<ForecastGrid | null>(null);
  const [weights, setWeights] = useState<WeightsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'forecast' | 'weights'>('forecast');
  
  // Point inspector state
  const [inspectPoint, setInspectPoint] = useState<{
    lat: number;
    lon: number;
    value: number;
    dominantModel: string;
    modelWeights?: { [m: string]: number };
  } | null>(null);

  // Outage simulation modal
  const [showOutageModal, setShowOutageModal] = useState<boolean>(false);
  const [disabledModels, setDisabledModels] = useState<string[]>([]);
  const [simulating, setSimulating] = useState<boolean>(false);

  // 1. Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [21.5, 82.0], // Center on India
      zoom: 5,
      minZoom: 4,
      maxZoom: 10,
      zoomControl: false,
    });

    // Add Esri Dark Gray canvas layers (100% free, zero watermark)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri, &copy; OpenStreetMap contributors',
      maxZoom: 16,
    }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      attribution: '',
      maxZoom: 16,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Fetch data whenever context changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchForecast(activeDate, activeLeadTime, activeVar).catch(() => null),
      fetchWeights(activeDate, activeLeadTime, activeVar).catch(() => null),
    ]).then(([fData, wData]) => {
      if (cancelled) return;
      setForecast(fData);
      setWeights(wData);
      setLoading(false);
      setDisabledModels([]);
    });

    return () => {
      cancelled = true;
    };
  }, [activeDate, activeLeadTime, activeVar]);

  // 3. Render Canvas Raster layer onto Leaflet Map
  useEffect(() => {
    const map = mapInstanceRef.current;
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

    // Create an off-screen canvas to render the color interpolated raster
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
        let rgba: [number, number, number, number] = [0, 0, 0, 0];

        if (viewMode === 'forecast') {
          rgba = interpolateColor(activeVar, val);
        } else if (weights && weights.grid.dominant_model?.[latIdx]?.[c]) {
          const domModel = weights.grid.dominant_model[latIdx][c];
          const colorHex = MODEL_COLORS[domModel] || '#38bdf8';
          const rCol = parseInt(colorHex.slice(1, 3), 16);
          const gCol = parseInt(colorHex.slice(3, 5), 16);
          const bCol = parseInt(colorHex.slice(5, 7), 16);
          rgba = [rCol, gCol, bCol, 0.75];
        }

        const idx = (r * cols + c) * 4;
        imgData.data[idx] = rgba[0];
        imgData.data[idx + 1] = rgba[1];
        imgData.data[idx + 2] = rgba[2];
        imgData.data[idx + 3] = Math.round(rgba[3] * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const imageOverlay = L.imageOverlay(canvas.toDataURL(), bounds, {
      opacity: 0.85,
      interactive: true,
    });

    imageOverlay.addTo(map);
    canvasLayerRef.current = imageOverlay;

    // Click handler for point inspection
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickLat = e.latlng.lat;
      const clickLon = e.latlng.lng;

      if (clickLat < south || clickLat > north || clickLon < west || clickLon > east) return;

      // Find nearest grid index
      let nearestR = 0;
      let minLatDiff = Infinity;
      for (let r = 0; r < rows; r++) {
        const diff = Math.abs(lat[r] - clickLat);
        if (diff < minLatDiff) {
          minLatDiff = diff;
          nearestR = r;
        }
      }

      let nearestC = 0;
      let minLonDiff = Infinity;
      for (let c = 0; c < cols; c++) {
        const diff = Math.abs(lon[c] - clickLon);
        if (diff < minLonDiff) {
          minLonDiff = diff;
          nearestC = c;
        }
      }

      const pointVal = values[nearestR]?.[nearestC] ?? 0;
      const dom = weights?.grid?.dominant_model?.[nearestR]?.[nearestC] ?? 'gfs';
      const wMap: { [m: string]: number } = {};
      if (weights?.grid?.weights) {
        for (const m of weights.models) {
          wMap[m] = weights.grid.weights[m]?.[nearestR]?.[nearestC] ?? 0;
        }
      }

      setInspectPoint({
        lat: Number(clickLat.toFixed(2)),
        lon: Number(clickLon.toFixed(2)),
        value: Number(pointVal.toFixed(2)),
        dominantModel: dom,
        modelWeights: wMap,
      });
    });

  }, [forecast, weights, viewMode, activeVar]);

  // Outage simulation handler
  const handleToggleOutageModel = async (modelName: string) => {
    const nextDisabled = disabledModels.includes(modelName)
      ? disabledModels.filter(m => m !== modelName)
      : [...disabledModels, modelName];

    if (nextDisabled.length >= (weights?.models.length || 3)) {
      alert('At least one model must remain active in the operational consensus.');
      return;
    }

    setDisabledModels(nextDisabled);
    setSimulating(true);

    try {
      if (nextDisabled.length === 0) {
        const originalWeights = await fetchWeights(activeDate, activeLeadTime, activeVar);
        setWeights(originalWeights);
      } else {
        const redistributed = await simulateDropout(activeDate, activeLeadTime, activeVar, nextDisabled);
        setWeights(redistributed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)', position: 'relative' }}>
      {/* IMD Guidance Banner */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.65rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        zIndex: 500,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
            IMD HAZARDS:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {alerts.slice(0, 2).map((a, i) => (
              <span key={i} className={`badge-risk ${(a.severity || 'orange').toLowerCase()}`} style={{ fontSize: '0.75rem' }}>
                {a.hazard_type} ({(a.peak_value ?? 0).toFixed(1)} {a.units}) • {a.affected_region}
              </span>
            ))}
          </div>
        </div>

        {/* Layer Mode Switch & Outage Simulator button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', padding: '0.2rem' }}>
            <button
              onClick={() => setViewMode('forecast')}
              className={`control-pill ${viewMode === 'forecast' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
            >
              <Layers size={13} /> Blended Forecast
            </button>
            <button
              onClick={() => setViewMode('weights')}
              className={`control-pill ${viewMode === 'weights' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
            >
              <Sparkles size={13} /> Model Weights
            </button>
          </div>

          <button
            onClick={() => setShowOutageModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              background: disabledModels.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)',
              border: `1px solid ${disabledModels.length > 0 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(56, 189, 248, 0.4)'}`,
              color: disabledModels.length > 0 ? '#fca5a5' : 'var(--accent-sky)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Zap size={14} />
            {disabledModels.length > 0 ? `Outage Active (${disabledModels.length})` : 'Simulate Outage'}
          </button>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Loading Spinner Overlay */}
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(7, 11, 19, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div className="glass-panel" style={{ padding: '1.5rem 2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="pulse-dot" style={{ width: '12px', height: '12px' }} />
              <span style={{ fontWeight: 600 }}>Loading 0.25° blended grid...</span>
            </div>
          </div>
        )}

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
            {viewMode === 'forecast' ? `${forecast?.variable.toUpperCase() || 'PRECIPITATION'} (${forecast?.units || 'mm/day'})` : 'DOMINANT MODEL'}
          </div>

          {viewMode === 'forecast' ? (
            <div>
              <div style={{
                height: '10px',
                borderRadius: '5px',
                background: 'linear-gradient(to right, #0f172a, #38bdf8, #2563eb, #f59e0b, #ef4444, #a855f7)',
                marginBottom: '0.4rem',
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                <span>0</span>
                <span>15</span>
                <span>64.5 (IMD Heavy)</span>
                <span>150+</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6' }} />
                <span>NOAA GFS (NWP1)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
                <span>NCUM / GEFS (NWP2)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#a855f7' }} />
                <span>GraphCast AI (AI1)</span>
              </div>
            </div>
          )}
        </div>

        {/* Point Inspector Drawer in top right */}
        {inspectPoint && (
          <div className="glass-panel" style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            padding: '1.25rem',
            zIndex: 900,
            width: '300px',
            animation: 'fadeIn 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-sky)', fontWeight: 700, fontSize: '0.9rem' }}>
                <MapPin size={16} /> Grid Cell Inspection
              </div>
              <button 
                onClick={() => setInspectPoint(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontFamily: 'JetBrains Mono' }}>
              {inspectPoint.lat}°N, {inspectPoint.lon}°E
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.04)', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Blended Forecast Value
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-sky)' }}>
                {inspectPoint.value} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{forecast?.units}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Dominant Model: <strong style={{ color: MODEL_COLORS[inspectPoint.dominantModel] || '#fff' }}>{inspectPoint.dominantModel.toUpperCase()}</strong>
            </div>

            {inspectPoint.modelWeights && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                {Object.entries(inspectPoint.modelWeights).map(([m, w]) => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: MODEL_COLORS[m] || '#ccc' }}>{m.toUpperCase()}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
                      {(w * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outage Simulation Modal */}
      {showOutageModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div className="glass-panel" style={{ width: '480px', maxWidth: '90vw', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={20} style={{ color: '#f59e0b' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Operational Resilience Simulator</h3>
              </div>
              <button 
                onClick={() => setShowOutageModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Simulates a live communication failure or ingest outage from upstream numerical or AI model providers. RituGrid automatically renormalizes weights so the forecast never drops out.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {['gfs', 'ncum', 'graphcast'].map(model => {
                const isDisabled = disabledModels.includes(model);
                return (
                  <div
                    key={model}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1.25rem',
                      borderRadius: '0.65rem',
                      background: isDisabled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${isDisabled ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: isDisabled ? '#fca5a5' : 'var(--text-main)' }}>
                        {model.toUpperCase()} {model === 'graphcast' ? '(DeepMind AI)' : '(Physics NWP)'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {isDisabled ? 'FEED OFFLINE (0% weight)' : 'OPERATIONAL (Ingesting)'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleOutageModel(model)}
                      disabled={simulating}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '0.4rem',
                        background: isDisabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${isDisabled ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                        color: isDisabled ? '#6ee7b7' : '#fca5a5',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      {isDisabled ? 'Restore Feed' : 'Kill Feed'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setDisabledModels([]);
                  handleToggleOutageModel('');
                  setShowOutageModal(false);
                }}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Reset All Feeds
              </button>
              <button
                onClick={() => setShowOutageModal(false)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.5rem',
                  background: 'var(--accent-blue)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
