import React, { useEffect } from 'react';
import type { ActiveView } from '../types';
import { 
  LayoutDashboard, 
  Flame, 
  Map as MapIcon, 
  AlertTriangle, 
  GitCompare, 
  Scale, 
  TrendingUp, 
  Award, 
  FileText, 
  X,
  Radio,
  CloudRain
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
}

interface MenuItem {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  tag?: string;
  category: 'core' | 'intelligence' | 'verification';
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'overview', label: 'Command Overview', icon: LayoutDashboard, category: 'core' },
  { id: 'operations', label: 'Operational Console', icon: Flame, tag: 'LIVE', category: 'core' },
  { id: 'map', label: 'Interactive Spatial Map', icon: MapIcon, category: 'core' },
  { id: 'alerts', label: 'IMD Hazard Warnings', icon: AlertTriangle, tag: 'ALERT', category: 'intelligence' },
  { id: 'comparison', label: 'Multi-Model Matrix', icon: GitCompare, category: 'intelligence' },
  { id: 'weights', label: 'Adaptive Model Weights', icon: Scale, category: 'intelligence' },
  { id: 'analysis', label: 'Forecast Trends & Spread', icon: TrendingUp, category: 'intelligence' },
  { id: 'skill', label: 'Model Skill Scores (ERA5)', icon: Award, category: 'verification' },
  { id: 'report', label: 'Operational Briefing', icon: FileText, category: 'verification' },
];

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer */}
      <aside className={`drawer-content ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-badge">RG</div>
            <div>
              <div className="brand-text">RituGrid</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                MoES / NCMRWF Blending
              </div>
            </div>
          </div>
          <button 
            className="hamburger-btn" 
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Categories */}
        <div className="drawer-body">
          {/* Core Operations */}
          <div className="drawer-section-title">Core Forecasting</div>
          {MENU_ITEMS.filter(m => m.category === 'core').map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={`drawer-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent-sky)' : 'var(--text-dim)' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.tag && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: item.tag === 'ALERT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                    color: item.tag === 'ALERT' ? '#fca5a5' : '#7dd3fc',
                    border: `1px solid ${item.tag === 'ALERT' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                  }}>
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })}

          {/* Intelligence & Analytics */}
          <div className="drawer-section-title" style={{ marginTop: '1rem' }}>Model Intelligence</div>
          {MENU_ITEMS.filter(m => m.category === 'intelligence').map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={`drawer-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent-sky)' : 'var(--text-dim)' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.tag && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                  }}>
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })}

          {/* Verification & Reporting */}
          <div className="drawer-section-title" style={{ marginTop: '1rem' }}>Verification & Quality</div>
          {MENU_ITEMS.filter(m => m.category === 'verification').map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={`drawer-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent-sky)' : 'var(--text-dim)' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer Pipeline Info */}
        <div className="drawer-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
            <Radio size={14} style={{ color: 'var(--accent-emerald)' }} />
            <span>Operational Grid: 0.25° (~27 km)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)' }}>
            <CloudRain size={14} />
            <span>Loss Metric: Quantile (α=0.90)</span>
          </div>
        </div>
      </aside>
    </>
  );
};
