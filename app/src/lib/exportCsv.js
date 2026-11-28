import { SCENARIOS, SPORTS } from '../config.js';

// Columns of the recommended-sites CSV, in order. geoids is a list in the
// data and is joined with semicolons.
const COLUMNS = [
  'scenario', 'scenario_label', 'rank', 'site_id', 'park_id', 'park_name', 'sport', 'sport_label',
  'lat', 'lon', 'cost_low', 'cost_typical', 'cost_high', 'maint_annual', 'cost_10yr',
  'residents_served', 'youth_served', 'cost_per_resident', 'geoids',
];

function cell(v) {
  if (v == null) return '';
  const s = Array.isArray(v) ? v.join(';') : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function recommendationsCsv(recommendations, scenario) {
  const rows = recommendations
    .filter((r) => !scenario || r.scenario === scenario)
    .map((r) => ({
      ...r,
      scenario_label: SCENARIOS.find((s) => s.id === r.scenario)?.label ?? r.scenario,
      sport_label: SPORTS.find((s) => s.id === r.sport)?.label ?? r.sport,
    }));
  const lines = [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))];
  return lines.join('\r\n') + '\r\n';
}

// Builds the CSV in the browser and starts a download. The byte-order mark
// makes Excel read the file as UTF-8.
export function downloadRecommendationsCsv(recommendations, scenario) {
  const blob = new Blob(['﻿', recommendationsCsv(recommendations, scenario)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `playmap_recommended_sites_${scenario ?? 'all_scenarios'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
