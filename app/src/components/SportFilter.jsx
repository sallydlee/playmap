import { SPORTS } from '../config.js';

export default function SportFilter({ sport, onChange }) {
  return (
    <div className="chips" role="group" aria-label="Filter by sport">
      <button className={!sport ? 'chip active' : 'chip'} onClick={() => onChange(null)}>
        All sports
      </button>
      {SPORTS.map((s) => (
        <button
          key={s.id}
          className={sport === s.id ? 'chip active' : 'chip'}
          onClick={() => onChange(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
