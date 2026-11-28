import { useState } from 'react';
import { SCENARIOS } from '../config.js';
import { downloadRecommendationsCsv } from '../lib/exportCsv.js';

export default function ExportPanel({ recommendations }) {
  const [scenario, setScenario] = useState('');
  const count = recommendations.filter((r) => !scenario || r.scenario === scenario).length;

  return (
    <div className="export">
      <h3>Export</h3>
      <label className="export-row">
        <span>Recommended sites</span>
        <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
          <option value="">All scenarios</option>
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
      <div className="export-buttons">
        <button className="btn" onClick={() => downloadRecommendationsCsv(recommendations, scenario || null)}>
          Download CSV ({count.toLocaleString()} sites)
        </button>
      </div>
    </div>
  );
}
