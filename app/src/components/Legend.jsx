import { SCORE_COLORS, SPORTS } from '../config.js';

export default function Legend({ sport }) {
  if (sport) {
    const label = SPORTS.find((s) => s.id === sport)?.label;
    return (
      <div className="legend">
        <span><i style={{ background: SCORE_COLORS[5] }} /> {label} within a 10-min walk</span>
        <span><i style={{ background: SCORE_COLORS[0] }} /> Not within 10 min</span>
      </div>
    );
  }
  return (
    <div className="legend">
      <span className="legend-title">Facility types within a 10-min walk</span>
      <div className="legend-scale">
        {SCORE_COLORS.map((c, i) => (
          <span key={c}><i style={{ background: c }} />{i}</span>
        ))}
      </div>
    </div>
  );
}
