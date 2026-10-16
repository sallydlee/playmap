import { SPORTS, WALK_THRESHOLD_MIN } from '../config.js';

function fmt(n) {
  return n == null ? 'n/a' : n.toLocaleString();
}

export default function NeighborhoodPanel({ feature, recommendations, onClose }) {
  if (!feature) {
    return <p className="hint">Tap an area on the map to see its access score.</p>;
  }
  const p = feature.properties;
  const recs = recommendations.filter((r) => r.geoid === p.geoid && r.scenario === 'full_gap_closure');

  return (
    <div className="panel-body">
      <div className="panel-header">
        <div>
          <h2>{p.neighborhood ?? 'Unnamed area'}</h2>
          <p className="sub">Block group {p.geoid}</p>
        </div>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="score">
        Access score <strong>{p.access_score ?? 'n/a'}</strong> of 5
      </p>
      <dl className="stats">
        <dt>Residents</dt><dd>{fmt(p.population)}</dd>
        <dt>Children and teens</dt><dd>{fmt(p.youth_population)}</dd>
        <dt>Median income</dt><dd>{p.median_income == null ? 'n/a' : `$${fmt(p.median_income)}`}</dd>
      </dl>
      <h3>Walking time to nearest facility</h3>
      <ul className="walk">
        {SPORTS.map((s) => {
          const m = p[`walk_min_${s.id}`];
          const ok = m != null && m <= WALK_THRESHOLD_MIN;
          return (
            <li key={s.id} className={ok ? 'ok' : 'gap'}>
              <span>{s.label}</span>
              <span>{m == null ? 'n/a' : `${Math.round(m)} min`}</span>
            </li>
          );
        })}
      </ul>
      {recs.length > 0 && (
        <>
          <h3>Recommended to close gaps</h3>
          <ul className="recs">
            {recs.map((r) => (
              <li key={r.site_id}>
                {SPORTS.find((s) => s.id === r.sport)?.label}:{' '}
                {r.cost_low == null ? 'cost not yet sourced' : `$${fmt(r.cost_low)} to $${fmt(r.cost_high)}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
