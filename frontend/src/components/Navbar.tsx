import React from 'react';
import type { ActiveView, WeatherVariable } from '../types';
import { Menu, Calendar, Clock, Droplets, Thermometer, Wind } from 'lucide-react';

interface NavbarProps {
  onToggleDrawer: () => void;
  activeView: ActiveView;
  activeDate: string;
  availableDates: string[];
  onChangeDate: (date: string) => void;
  activeLeadTime: number;
  onChangeLeadTime: (lt: number) => void;
  activeVar: WeatherVariable;
  onChangeVar: (v: WeatherVariable) => void;
  apiHealthy: boolean;
}

const VIEW_TITLES: Record<ActiveView, string> = {
  overview: 'Command Overview',
  operations: 'Operational Blending Console',
  map: 'Interactive Spatial Forecast Map',
  alerts: 'IMD Extreme Weather Hazards',
  comparison: 'Multi-Model Matrix (NWP vs AI)',
  weights: 'Adaptive Model Weight Distribution',
  analysis: 'Synoptic Trends & Spread Analysis',
  skill: 'Verification Skill Scores vs ERA5',
  report: 'Operational Forecast Briefing',
};

export const Navbar: React.FC<NavbarProps> = ({
  onToggleDrawer,
  activeView,
  activeDate,
  availableDates,
  onChangeDate,
  activeLeadTime,
  onChangeLeadTime,
  activeVar,
  onChangeVar,
  apiHealthy,
}) => {
  return (
    <header className="top-navbar">
      {/* Left: Hamburger & Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          className="hamburger-btn"
          onClick={onToggleDrawer}
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="brand-badge">RG</div>
          <div>
            <div className="brand-text">RituGrid</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.02em' }}>
              Super-Forecast Blending
            </div>
          </div>
        </div>

        {/* Breadcrumb Pill */}
        <div style={{
          display: 'none',
          padding: '0.3rem 0.75rem',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          color: 'var(--accent-sky)',
          fontWeight: 600,
          marginLeft: '0.5rem',
        }}>
          {VIEW_TITLES[activeView]}
        </div>
      </div>

      {/* Center: Context Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
          <Calendar size={14} style={{ color: 'var(--accent-sky)' }} />
          <select 
            value={activeDate}
            onChange={(e) => onChangeDate(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {availableDates.map(d => (
              <option key={d} value={d} style={{ background: '#0f172a', color: '#fff' }}>
                {d.slice(0, 4)}-{d.slice(4, 6)}-{d.slice(6, 8)}
              </option>
            ))}
          </select>
        </div>

        {/* Lead Time Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)' }}>
          <Clock size={14} style={{ color: 'var(--text-dim)', marginLeft: '0.4rem' }} />
          {[24, 48, 72, 120].map(lt => (
            <button
              key={lt}
              className={`control-pill ${activeLeadTime === lt ? 'active' : ''}`}
              onClick={() => onChangeLeadTime(lt)}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
            >
              +{lt}h
            </button>
          ))}
        </div>

        {/* Variable Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)' }}>
          <button
            className={`control-pill ${activeVar === 'tp' ? 'active' : ''}`}
            onClick={() => onChangeVar('tp')}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
          >
            <Droplets size={13} /> Rain
          </button>
          <button
            className={`control-pill ${activeVar === 't2m' ? 'active' : ''}`}
            onClick={() => onChangeVar('t2m')}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
          >
            <Thermometer size={13} /> Temp
          </button>
          <button
            className={`control-pill ${activeVar === 'ws10' ? 'active' : ''}`}
            onClick={() => onChangeVar('ws10')}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem' }}
          >
            <Wind size={13} /> Wind
          </button>
        </div>
      </div>

      {/* Right: API Health Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          background: apiHealthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${apiHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          fontSize: '0.75rem',
          fontWeight: 700,
          color: apiHealthy ? '#34d399' : '#f87171',
          letterSpacing: '0.04em',
        }}>
          <span className="pulse-dot" style={{ background: apiHealthy ? '#10b981' : '#ef4444' }} />
          <span>{apiHealthy ? 'API ONLINE (:8000)' : 'API OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
};
