import { useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView.jsx';
import SportFilter from './components/SportFilter.jsx';
import Legend from './components/Legend.jsx';
import NeighborhoodPanel from './components/NeighborhoodPanel.jsx';
import FacilityPanel from './components/FacilityPanel.jsx';
import ConfidenceFilter from './components/ConfidenceFilter.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import { CONFIDENCE_BANDS } from './config.js';
import { loadData } from './lib/data.js';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sport, setSport] = useState(null);
  const [selectedGeoid, setSelectedGeoid] = useState(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [showDetections, setShowDetections] = useState(true);
  const [bands, setBands] = useState(() => new Set(CONFIDENCE_BANDS));

  useEffect(() => {
    loadData().then(setData).catch((e) => setError(e.message));
  }, []);

  const selectedFeature = useMemo(
    () => data?.blockGroups.features.find((f) => f.properties.geoid === selectedGeoid) ?? null,
    [data, selectedGeoid]
  );
  const selectedFacility = useMemo(
    () => data?.facilities.features.find((f) => f.properties.facility_id === selectedFacilityId) ?? null,
    [data, selectedFacilityId]
  );
  const hasDetections = useMemo(
    () => data?.facilities.features.some((f) => f.properties.source === 'model') ?? false,
    [data]
  );

  function selectGeoid(geoid) {
    setSelectedFacilityId(null);
    setSelectedGeoid(geoid);
  }
  function selectFacility(id) {
    setSelectedGeoid(null);
    setSelectedFacilityId(id);
  }
  function toggleDetections(on) {
    setShowDetections(on);
    if (!on && selectedFacility?.properties.source === 'model') setSelectedFacilityId(null);
  }
  function changeBands(next) {
    setBands(next);
    const p = selectedFacility?.properties;
    if (p?.source === 'model' && !next.has(p.confidence_band)) setSelectedFacilityId(null);
  }

  if (error) return <div className="status">Could not load data: {error}</div>;
  if (!data) return <div className="status">Loading PlayMap…</div>;

  const { label, data_version: version } = data.citySummary;
  const badge = label ?? (version?.startsWith('v0') ? `Demo data (${version})` : null);

  return (
    <div className="app">
      <MapView
        blockGroups={data.blockGroups}
        facilities={data.facilities}
        sport={sport}
        showDetections={showDetections}
        bands={bands}
        selectedGeoid={selectedGeoid}
        selectedFacilityId={selectedFacilityId}
        onSelect={selectGeoid}
        onSelectFacility={selectFacility}
      />
      <header className="topbar">
        <h1>PlayMap</h1>
        {badge && <span className="badge">{badge}</span>}
      </header>
      <section className="sheet" aria-label="Map controls and details">
        <SportFilter sport={sport} onChange={setSport} />
        <Legend
          sport={sport}
          hasDetections={hasDetections}
          detectionsInScores={data.citySummary.detections_in_scores === true}
          showDetections={showDetections}
          onToggleDetections={toggleDetections}
        />
        {hasDetections && showDetections && <ConfidenceFilter bands={bands} onChange={changeBands} />}
        {selectedFacility ? (
          <FacilityPanel facility={selectedFacility} onClose={() => setSelectedFacilityId(null)} />
        ) : (
          <NeighborhoodPanel
            feature={selectedFeature}
            recommendations={data.recommendations}
            onClose={() => setSelectedGeoid(null)}
          />
        )}
        <ExportPanel recommendations={data.recommendations} />
      </section>
    </div>
  );
}
