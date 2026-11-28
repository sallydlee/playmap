import { FACILITY_COLORS, SCORE_COLORS, SPORTS } from '../config.js';

function FacilityKey({ hasDetections, detectionsInScores, showDetections, onToggleDetections }) {
  return (
    <div className="legend legend-facilities">
      <span><b className="dot" style={{ background: FACILITY_COLORS.mapped }} />Mapped facility</span>
      <span><b className="dot" style={{ background: '#fff', borderColor: FACILITY_COLORS.mapped }} />On school grounds</span>
      {hasDetections && (
        <label className="toggle">
          <input type="checkbox" checked={showDetections} onChange={(e) => onToggleDetections(e.target.checked)} />
          <b className="dot" style={{ background: FACILITY_COLORS.detection }} />
          {detectionsInScores ? 'Model detections (unreviewed)' : 'Model detections (unreviewed, not in scores yet)'}
        </label>
      )}
    </div>
  );
}

export default function Legend({ sport, ...facilityProps }) {
  const scale = sport ? (
    <div className="legend">
      <span><i style={{ background: SCORE_COLORS[SCORE_COLORS.length - 1] }} /> {SPORTS.find((s) => s.id === sport)?.label} within a 10-min walk</span>
      <span><i style={{ background: SCORE_COLORS[0] }} /> Not within 10 min</span>
    </div>
  ) : (
    <div className="legend">
      <span className="legend-title">Facility types within a 10-min walk</span>
      <div className="legend-scale">
        {SCORE_COLORS.map((c, i) => (
          <span key={c}><i style={{ background: c }} />{i}</span>
        ))}
      </div>
    </div>
  );
  return (
    <>
      {scale}
      <FacilityKey {...facilityProps} />
    </>
  );
}
