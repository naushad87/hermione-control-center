// @ts-nocheck
import React, { useState, useEffect } from 'react';
import './neural-graph.css';
import ControlCenter, { AskContext } from './NeuralGraph';
import AskGateway from './NeuralAsk';
import ScannerEDashboard from './ScannerEDashboard';
import { useLiveData } from './useLiveData';

export default function App() {
  const [askState, setAskState] = useState('idle');
  const [askResponse, setAskResponse] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(() => window.location.hash === '#sniper' ? 'sniper' : 'neural');

  const { data, isLive } = useLiveData();

  useEffect(() => {
    const handler = () => setView(window.location.hash === '#sniper' ? 'sniper' : 'neural');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (view === 'sniper') {
    return (
      <ScannerEDashboard onBack={() => {
        window.location.hash = '';
        setView('neural');
      }} />
    );
  }

  return (
    <AskContext.Provider value={{ askState, setAskState, askResponse, setAskResponse, selected, setSelected }}>
      <div className="hc-app" data-palette="observatory">
        <ControlCenter data={data} />
        <AskGateway data={data} />
        {/* LIVE/MOCK status pill */}
        <div className="hc-live-pill" data-live={isLive ? 'true' : 'false'}>
          <span className="hc-live-dot" />
          {isLive ? 'LIVE' : 'MOCK'}
        </div>
      </div>
    </AskContext.Provider>
  );
}
