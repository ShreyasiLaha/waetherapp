import React, { useEffect, useState } from 'react';
import type { WeatherVariable } from '../types';
import { fetchForecast } from '../services/api';
import { TrendingUp, Clock } from 'lucide-react';

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
  const [leadStats, setLeadStats] = useState<{
    [lt: number]: { max: number; mean: number };
  }>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const horizons = [24, 48, 72, 120];
    Promise.all(horizons.map(lt => fetchForecast(activeDate, lt, activeVar).catch(() => null)))
      .then(results => {
        if (cancelled) return;
        const stats: { [lt: number]: { max: number; mean: number } } = {};
        horizons.forEach((lt, idx) => {
          const res = results[idx];
          if (res && res.grid && res.grid.values) {
            let maxVal = 0;
            let sum = 0;
            let count = 0;
            for (const row of res.grid.values) {
              if (row) {
                for (const v of row) {
                  if (v != null) {
                    if (v > maxVal) maxVal = v;
                    sum += v;
                    count += 1;
                  }
                }
              }
            }
            stats[lt] = {
              max: Number(maxVal.toFixed(1)),
              mean: count > 0 ? Number((sum / count).toFixed(1)) : 0,
            };
          } else {
            stats[lt] = { max: 0, mean: 0 };
          }
        });
        setLeadStats(stats);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeDate, activeVar]);

  const unit = activeVar === 'tp' ? 'mm/day' : activeVar === 't2m' ? 'K' : 'm/s';

  const horizons = [
    { lt: 24, label: 'Day 1 (Immediate)', tag: 'High Confidence' },
    { lt: 48, label: 'Day 2 (Operational)', tag: 'High Confidence' },
    { lt: 72, label: 'Day 3 (Advisory)', tag: 'Medium Confidence' },
    { lt: 120, label: 'Day 5 (Outlook)', tag: 'Moderate Confidence' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <TrendingUp size={28} style={{ color: 'var(--accent-sky)' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Synoptic Forecast Trends Across Horizons</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Live temporal decay and extreme peak preservation from Day 1 (+24h) to Day 5 (+120h) for {activeDate}.
        </p>
      </div>

      {/* Trajectory Cards */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Dynamic Subcontinent Forecast Progression ({activeVar.toUpperCase()})
        </h3>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>
            Computing multi-horizon trajectory...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {horizons.map(h => {
              const stat = leadStats[h.lt] || { max: 0, mean: 0 };
              const isSelected = activeLeadTime === h.lt;

              return (
                <div
                  key={h.lt}
                  style={{
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-sky)' }}>
                      +{h.lt} Hours
                    </span>
                    <span style={{ fontSize: '0.7rem', color: isSelected ? '#38bdf8' : 'var(--text-dim)', fontWeight: 600 }}>
                      {h.tag}
                    </span>
                  </div>

                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                    {stat.max} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{unit}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                    Grid Max Peak
                  </div>

                  <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Domain Mean:</span>
                    <strong style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-sky)' }}>{stat.mean} {unit}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
