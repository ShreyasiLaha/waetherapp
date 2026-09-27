import React, { useState } from 'react';
import type { IMDAlert } from '../types';
import { 
  AlertTriangle, 
  ShieldAlert, 
  MapPin, 
  Clock, 
  Filter, 
  Compass,
  AlertCircle
} from 'lucide-react';

interface AlertsViewProps {
  alerts: IMDAlert[];
  activeDate: string;
  activeLeadTime: number;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  activeDate,
  activeLeadTime,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'RED' | 'ORANGE' | 'YELLOW'>('ALL');

  const filtered = filterSeverity === 'ALL' 
    ? alerts 
    : alerts.filter(a => a.severity === filterSeverity);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <ShieldAlert size={28} style={{ color: '#ef4444' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>IMD Hazard Guidance Bulletin</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Rule-based extreme weather classification under IMD operational protocols for {activeDate} (+{activeLeadTime}h lead).
          </p>
        </div>

        {/* Severity Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.25rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)' }}>
          {(['ALL', 'RED', 'ORANGE', 'YELLOW'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`control-pill ${filterSeverity === sev ? 'active' : ''}`}
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
            >
              {sev === 'RED' && '🔴 '}
              {sev === 'ORANGE' && '🟠 '}
              {sev === 'YELLOW' && '🟡 '}
              {sev} ({sev === 'ALL' ? alerts.length : alerts.filter(a => a.severity === sev).length})
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Grid */}
      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--text-dim)', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Alerts in This Category</h3>
          <p style={{ color: 'var(--text-muted)' }}>No meteorological hazard criteria breached for the selected filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filtered.map((alert, idx) => (
            <div 
              key={idx} 
              className="glass-panel glass-panel-hover"
              style={{
                padding: '1.75rem',
                borderLeft: `4px solid ${
                  alert.severity === 'RED' ? '#ef4444' : alert.severity === 'ORANGE' ? '#f97316' : '#f59e0b'
                }`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    {alert.hazard_type}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <MapPin size={14} /> {alert.affected_region}
                  </div>
                </div>

                <span className={`badge-risk ${(alert.severity || 'ORANGE').toLowerCase()}`}>
                  {alert.severity || 'ORANGE'} ALERT
                </span>
              </div>

              {/* Data Table */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                fontSize: '0.85rem',
              }}>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>PEAK VALUE</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-sky)' }}>
                    {alert.peak_value.toFixed(1)} {alert.units}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>IMD THRESHOLD</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                    &ge; {alert.threshold_value} {alert.units}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>AFFECTED GRID CELLS</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                    {alert.affected_grid_cells} cells (~{(alert.affected_grid_cells * 729).toLocaleString()} km²)
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>LEAD TIME</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                    +{alert.lead_time_hours} Hours
                  </div>
                </div>
              </div>

              {/* Bulletin Text */}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                {alert.bulletin_text}
              </p>

              {/* Model Divergence Callout */}
              {alert.model_divergence_flag && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.75rem',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <AlertTriangle size={14} />
                  <span><strong>High Model Divergence:</strong> Physics NWP and AI models diverge by &gt;40%. Hybrid consensus applied.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
