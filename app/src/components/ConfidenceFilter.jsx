import { CONFIDENCE_BANDS, CONFIDENCE_LABELS } from '../config.js';

// Chips that show or hide model detections by confidence band. This only
// changes which dots are drawn; access scores are fixed by the model run.
export default function ConfidenceFilter({ bands, onChange }) {
  function toggle(band) {
    const next = new Set(bands);
    if (next.has(band)) next.delete(band);
    else next.add(band);
    onChange(next);
  }
  return (
    <div className="legend confidence">
      <span className="legend-title">Detection confidence</span>
      <div className="chips chips-small" role="group" aria-label="Filter detections by confidence">
        {CONFIDENCE_BANDS.map((b) => (
          <button
            key={b}
            className={bands.has(b) ? 'chip active' : 'chip'}
            aria-pressed={bands.has(b)}
            onClick={() => toggle(b)}
          >
            {CONFIDENCE_LABELS[b]}
          </button>
        ))}
      </div>
    </div>
  );
}
