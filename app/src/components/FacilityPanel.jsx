import { SPORTS } from '../config.js';

const SOURCE_TEXT = {
  osm: 'Mapped in OpenStreetMap',
  model: 'Spotted by the computer vision model in aerial photos',
  both: 'Mapped in OpenStreetMap and spotted by the model',
};

// Why a facility is or is not in the access scores. duplicate_of is set when a
// detection is a facility already mapped in OSM, which is counted instead.
function countedText(p) {
  if (p.counts_for_access) return 'Yes';
  if (p.duplicate_of) return 'Yes, as the mapped facility';
  if (p.source === 'model' && p.confidence_band === 'low') return 'No, low confidence';
  return 'Not yet';
}

export default function FacilityPanel({ facility, onClose }) {
  const p = facility.properties;
  const label = SPORTS.find((s) => s.id === p.sport)?.label ?? p.sport;
  const isDetection = p.source === 'model';

  return (
    <div className="panel-body">
      <div className="panel-header">
        <div>
          <h2>{label}</h2>
          <p className="sub">{p.park_name ?? SOURCE_TEXT[p.source] ?? p.source}</p>
        </div>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <dl className="stats">
        {isDetection && (
          <>
            <dt>Model confidence</dt>
            <dd>{p.confidence_band ?? 'n/a'}</dd>
            <dt>Aerial photo</dt>
            <dd>{p.imagery_year ?? 'n/a'}</dd>
            <dt>Checked by a person</dt>
            <dd>{p.status === 'verified' ? 'Yes, confirmed' : p.status === 'rejected' ? 'Yes, rejected' : 'Not yet'}</dd>
          </>
        )}
        {!isDetection && (
          <>
            <dt>On school grounds</dt>
            <dd>{p.on_school_grounds == null ? 'n/a' : p.on_school_grounds ? 'Yes' : 'No'}</dd>
          </>
        )}
        <dt>Counted in access scores</dt>
        <dd>{countedText(p)}</dd>
      </dl>
      {isDetection && (
        <p className="note">
          This is the model's guess from above. It may be wrong, and it does not tell us whether the
          public can use the facility. Confidence bands are provisional.
        </p>
      )}
    </div>
  );
}
