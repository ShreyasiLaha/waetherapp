import React, { useEffect, useState } from 'react';
import type { ActiveView, WeatherVariable, IMDAlert } from './types';
import { fetchDates, fetchAlerts, fetchHealth } from './services/api';
import { Navbar } from './components/Navbar';
import { SidebarDrawer } from './components/SidebarDrawer';
import { OverviewView } from './views/OverviewView';
import { OperationsView } from './views/OperationsView';
import { MapView } from './views/MapView';
import { AlertsView } from './views/AlertsView';
import { ComparisonView } from './views/ComparisonView';
import { WeightsView } from './views/WeightsView';
import { AnalysisView } from './views/AnalysisView';
import { SkillView } from './views/SkillView';
import { ReportView } from './views/ReportView';

export function App() {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  
  // Forecast context state
  const [availableDates, setAvailableDates] = useState<string[]>(['20230715', '20230714', '20230716', '20230717']);
  const [activeDate, setActiveDate] = useState<string>('20230715');
  const [activeLeadTime, setActiveLeadTime] = useState<number>(48);
  const [activeVar, setActiveVar] = useState<WeatherVariable>('tp');

  // Backend state
  const [alerts, setAlerts] = useState<IMDAlert[]>([]);
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);

  // Initialize dates & health
  useEffect(() => {
    fetchHealth()
      .then(h => setApiHealthy(h.status === 'ok'))
      .catch(() => setApiHealthy(false));

    fetchDates().then(dates => {
      if (dates.length) {
        setAvailableDates(dates);
        if (!dates.includes(activeDate)) {
          setActiveDate(dates[0]);
        }
      }
    });
  }, []);

  // Fetch alerts when date changes
  useEffect(() => {
    fetchAlerts(activeDate, activeLeadTime).then(data => {
      setAlerts(data);
    });
  }, [activeDate, activeLeadTime]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        onToggleDrawer={() => setDrawerOpen(prev => !prev)}
        activeView={activeView}
        activeDate={activeDate}
        availableDates={availableDates}
        onChangeDate={setActiveDate}
        activeLeadTime={activeLeadTime}
        onChangeLeadTime={setActiveLeadTime}
        activeVar={activeVar}
        onChangeVar={setActiveVar}
        apiHealthy={apiHealthy}
      />

      {/* Slide-out Hamburger Drawer */}
      <SidebarDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeView={activeView}
        onSelectView={(view) => setActiveView(view)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeView === 'overview' && (
          <OverviewView
            activeDate={activeDate}
            activeLeadTime={activeLeadTime}
            activeVar={activeVar}
            alerts={alerts}
            onNavigate={(v) => setActiveView(v)}
          />
        )}
        {activeView === 'operations' && (
          <OperationsView
            activeDate={activeDate}
            activeLeadTime={activeLeadTime}
            activeVar={activeVar}
            alerts={alerts}
          />
        )}
        {activeView === 'map' && (
          <MapView
            activeDate={activeDate}
            activeLeadTime={activeLeadTime}
            activeVar={activeVar}
          />
        )}
        {activeView === 'alerts' && (
          <AlertsView
            alerts={alerts}
            activeDate={activeDate}
            activeLeadTime={activeLeadTime}
          />
        )}
        {activeView === 'comparison' && (
          <ComparisonView
            activeDate={activeDate}
            activeLeadTime={activeLeadTime}
            activeVar={activeVar}
          />
        )}
        {activeView === 'weights' && (
          <WeightsView
            activeDate={activeDate}
            activeLeadTime={activeLeadTime}
            activeVar={activeVar}
          />
        )}
        {activeView === 'analysis' && (
          <AnalysisView
            activeDate={activeDate}
            activeLeadTime={activeLeadTime}
            activeVar={activeVar}
          />
        )}
        {activeView === 'skill' && (
          <SkillView
            activeDate={activeDate}
            activeLeadTime={activeLeadTime}
            activeVar={activeVar}
          />
        )}
        {activeView === 'report' && (
          <ReportView
            activeDate={activeDate}
            activeLeadTime={activeLeadTime}
            activeVar={activeVar}
            alerts={alerts}
          />
        )}
      </main>
    </div>
  );
}

export default App;
