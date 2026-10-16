import { useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView.jsx';
import SportFilter from './components/SportFilter.jsx';
import Legend from './components/Legend.jsx';
import NeighborhoodPanel from './components/NeighborhoodPanel.jsx';
import { loadData } from './lib/data.js';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sport, setSport] = useState(null);
  const [selectedGeoid, setSelectedGeoid] = useState(null);

  useEffect(() => {
    loadData().then(setData).catch((e) => setError(e.message));
  }, []);

  const selectedFeature = useMemo(
    () => data?.blockGroups.features.find((f) => f.properties.geoid === selectedGeoid) ?? null,
    [data, selectedGeoid]
  );

  if (error) return <div className="status">Could not load data: {error}</div>;
  if (!data) return <div className="status">Loading PlayMap…</div>;

  const isMock = data.citySummary.data_version?.startsWith('v0');

  return (
    <div className="app">
      <MapView
        blockGroups={data.blockGroups}
        facilities={data.facilities}
        sport={sport}
        selectedGeoid={selectedGeoid}
        onSelect={setSelectedGeoid}
      />
      <header className="topbar">
        <h1>PlayMap</h1>
        {isMock && <span className="badge">Demo data ({data.citySummary.data_version})</span>}
      </header>
      <section className="sheet" aria-label="Map controls and details">
        <SportFilter sport={sport} onChange={setSport} />
        <Legend sport={sport} />
        <NeighborhoodPanel
          feature={selectedFeature}
          recommendations={data.recommendations}
          onClose={() => setSelectedGeoid(null)}
        />
      </section>
    </div>
  );
}
