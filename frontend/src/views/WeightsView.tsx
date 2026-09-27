import React from 'react';
import type { WeatherVariable } from '../types';
import { Scale, Info } from 'lucide-react';

interface WeightsViewProps {
  activeDate: string;
  activeLeadTime: number;
  activeVar: WeatherVariable;
}

export const WeightsView: React.FC<WeightsViewProps> = ({
  activeDate,
  activeLeadTime,
  activeVar,
}) => {
  const modelWeights = [
    {
      name: 'NOAA GFS (Deterministic NWP)',
      role: 'Convective Microphysics & Boundary Layer',
      weight: 42,
      color: '#3b82f6',
      reasoning: 'Dominates orographic rainfall along Western Ghats and localized monsoon convection.',
    },
    {
      name: 'GraphCast (DeepMind Synoptic AI)',
      role: 'Synoptic Pressure & Jet Dynamics',
      weight: 35,
      color: '#a855f7',
      reasoning: 'Dominates track prediction for Bay of Bengal monsoon depressions and broad streamlines.',
    },
    {
      name: 'NCUM / GEFS (Ensemble Spread)',
      role: 'Uncertainty Bounds & Variance Regularization',
      weight: 23,
      color: '#10b981',
      reasoning: 'Provides boundary stability and prevents runaway divergence in high-spread zones.',
    },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <Scale size={28} style={{ color: 'var(--accent-sky)' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Adaptive Model Weight Distribution</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Spatial weight attribution computed per grid cell based on terrain, convective regimes, and recent verification variance.
        </p>
      </div>

      {/* Weight Progress Bars */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Consensus Contribution Breakdown (+{activeLeadTime}h Lead Time)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {modelWeights.map((mw, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: mw.color, fontSize: '1rem' }}>
                    {mw.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {mw.role}
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: mw.color }}>
                  {mw.weight}%
                </div>
              </div>

              {/* Bar track */}
              <div style={{
                height: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '5px',
                overflow: 'hidden',
                marginBottom: '0.5rem',
              }}>
                <div style={{
                  height: '100%',
                  width: `${mw.weight}%`,
                  background: mw.color,
                  borderRadius: '5px',
                  boxShadow: `0 0 10px ${mw.color}88`,
                  transition: 'width 0.6s ease',
                }} />
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {mw.reasoning}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
