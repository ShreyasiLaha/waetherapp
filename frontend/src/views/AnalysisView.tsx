import React from 'react';
import type { WeatherVariable } from '../types';
import { TrendingUp, BarChart2, Calendar } from 'lucide-react';

interface AnalysisViewProps {
  activeDate: string;
  activeLeadTime: number;
  activeVar: WeatherVariable;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  activeDate,
  activeLeadTime,
  activeVar,
}) => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <TrendingUp size={28} style={{ color: 'var(--accent-sky)' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Synoptic Forecast Trends & Spread</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Temporal progression of meteorological parameters from Day 1 (+24h) through Day 5 (+120h).
        </p>
      </div>

      {/* Trajectory Timeline */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Consensus Trajectory Across Lead Times
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { lt: '24h', title: 'Day 1 (Immediate)', peak: '142.3 mm', status: 'High Confidence', acc: '99.98%' },
            { lt: '48h', title: 'Day 2 (Operational)', peak: '127.9 mm', status: 'High Confidence', acc: '99.96%' },
            { lt: '72h', title: 'Day 3 (Advisory)', peak: '98.5 mm', status: 'Moderate Confidence', acc: '99.82%' },
            { lt: '120h', title: 'Day 5 (Outlook)', peak: '64.2 mm', status: 'Moderate Confidence', acc: '99.45%' },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                padding: '1.5rem',
                borderRadius: '0.75rem',
                background: step.lt === `${activeLeadTime}h` ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: step.lt === `${activeLeadTime}h` ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-sky)' }}>+{step.lt}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>{step.acc}</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>{step.peak}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{step.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
