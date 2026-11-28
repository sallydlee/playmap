import { MAX_SCORE, SPORTS, WALK_THRESHOLD_MIN } from '../config.js';

function fmt(n) {
  return n == null ? 'n/a' : Math.round(n).toLocaleString();
}

function money(n) {
  if (n == null) return 'n/a';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${fmt(n)}`;
}

export default function NeighborhoodPanel({ feature, recommendations, onClose }) {
  if (!feature) {
    return <p className="hint">Tap an area on the map to see its access score, or a dot to see the facility.</p>;
  }
  const p = feature.properties;
  const recs = recommendations.filter((r) => r.geoids?.includes(p.geoid) && r.scenario === 'full_gap_closure');

  return (
    <div className="panel-body">
      <div className="panel-header">
        <div>
          <h2>{p.neighborhood ?? 'Detroit block group'}</h2>
          <p className="sub">Block group {p.geoid}</p>
        </div>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="score">
        Access score <strong>{p.access_score ?? 'n/a'}</strong> of {MAX_SCORE}
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
                <strong>{SPORTS.find((s) => s.id === r.sport)?.label ?? r.sport}</strong>
                {r.park_name ? ` at ${r.park_name}` : ''}
                <br />
                <span className="sub">
                  {r.cost_low == null
                    ? 'cost not yet sourced'
                    : `About ${money(r.cost_typical)} to build (range ${money(r.cost_low)} to ${money(r.cost_high)})`}
                  {r.residents_served != null && `, reaches ${fmt(r.residents_served)} more residents`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
