import React from 'react';
import type { WeatherVariable, IMDAlert } from '../types';
import { FileText, Printer, Download, CheckCircle } from 'lucide-react';

interface ReportViewProps {
  activeDate: string;
  activeLeadTime: number;
  activeVar: WeatherVariable;
  alerts: IMDAlert[];
}

export const ReportView: React.FC<ReportViewProps> = ({
  activeDate,
  activeLeadTime,
  activeVar,
  alerts,
}) => {
  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <FileText size={28} style={{ color: 'var(--accent-sky)' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Meteorological Operational Briefing</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Automated consensus summary report for Ministry of Earth Sciences (MoES) and IMD Duty Officers.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '0.5rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-subtle)',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Printer size={16} /> Print / Export PDF
        </button>
      </div>

      {/* Briefing Paper Document */}
      <div className="glass-panel" style={{ padding: '3rem', background: '#0d1322', border: '1px solid rgba(255,255,255,0.12)' }}>
        {/* Document Header */}
        <div style={{ borderBottom: '2px solid rgba(56, 189, 248, 0.4)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-sky)' }}>RituGrid Operational Bulletin</span>
            <span style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', color: 'var(--text-dim)' }}>REF: RG-2023-MOES-D2</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            VALID FOR: <strong>{activeDate} (+{activeLeadTime}h Horizon)</strong> | DOMAIN: Indian Subcontinent (5°N–35°N, 65°E–100°E)
          </div>
        </div>

        {/* Section 1 */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem' }}>
            1. Synoptic & Convective Situation Overview
          </h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
            Active monsoon depression centered over the central and eastern subcontinent with strong south-westerly Arabian Sea flow. Blended models indicate localized extreme precipitation exceeding 120 mm/day along the depression axis, with secondary convective peaks across coastal belts.
          </p>
        </div>

        {/* Section 2 */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem' }}>
            2. Multi-Model Consensus Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.03)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>PHYSICS NWP (GFS/NCUM)</div>
              <div style={{ fontWeight: 700, color: '#60a5fa', marginTop: '0.25rem' }}>42% Weight</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Resolved convective peaks in Western Ghats</div>
            </div>
            <div style={{ padding: '1rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.03)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SYNOPTIC AI (GRAPHCAST)</div>
              <div style={{ fontWeight: 700, color: '#c084fc', marginTop: '0.25rem' }}>35% Weight</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>High fidelity on depression center position</div>
            </div>
            <div style={{ padding: '1rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.03)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ENSEMBLE REGULARIZER</div>
              <div style={{ fontWeight: 700, color: '#34d399', marginTop: '0.25rem' }}>23% Weight</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Bounded divergence across boundary cells</div>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem' }}>
            3. Active IMD Warnings ({alerts.length})
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alerts.map((a, i) => (
              <li key={i} style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{a.hazard_type}</strong> in {a.affected_region} (Peak: {a.peak_value.toFixed(1)} {a.units})
                </div>
                <span className={`badge-risk ${a.severity.toLowerCase()}`}>
                  {a.severity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
