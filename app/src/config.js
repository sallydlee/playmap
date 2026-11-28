// Central settings. Swap the basemap here if its terms change or it needs a key.

// OpenFreeMap serves free vector basemaps with no API key. Confirm its terms
// before launch; any MapLibre-compatible style URL works here.
export const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

// Approximate center of Detroit.
export const INITIAL_VIEW = { longitude: -83.1, latitude: 42.36, zoom: 10 };

// Files written by data_pipeline/export_web_data.py (see docs/data_contract.md).
export const DATA_FILES = {
  facilities: '/data/facilities.geojson',
  blockGroups: '/data/block_groups.geojson',
  recommendations: '/data/recommendations.json',
  citySummary: '/data/city_summary.json',
};

// The access model's four facility types. Soccer and football share one
// "rectangular_field" type in the model outputs.
export const SPORTS = [
  { id: 'tennis_court', label: 'Tennis' },
  { id: 'basketball_court', label: 'Basketball' },
  { id: 'rectangular_field', label: 'Soccer / football field' },
  { id: 'baseball_diamond', label: 'Baseball / softball' },
];

// A 10-minute walk, the goals document's access threshold. The model defines
// it as 805 m; the export script converts meters to minutes at 80.5 m/min.
export const WALK_THRESHOLD_MIN = 10;

// Access score 0 (no facility types within a 10-minute walk) to 4 (all four).
// Low scores are the warm colors so gaps stand out.
export const SCORE_COLORS = ['#b2182b', '#ef8a62', '#f7f7f7', '#67a9cf', '#2166ac'];
export const MAX_SCORE = SCORE_COLORS.length - 1;

// Facility dots. Model detections use the brand lime so they read apart from
// mapped (OSM) facilities and from the red-to-blue score scale.
export const FACILITY_COLORS = { mapped: '#203627', detection: '#E8FF40' };

// Confidence bands come from the detection export. Their cutoffs are
// placeholders until the hand-tagged test set is scored.
export const CONFIDENCE_BANDS = ['high', 'medium', 'low'];

// Labels for the confidence filter chips.
export const CONFIDENCE_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

// The access model's three recommendation scenarios (recommendations.json).
export const SCENARIOS = [
  { id: 'full_gap_closure', label: 'Close every gap' },
  { id: 'fixed_annual_budget', label: 'Fixed annual budget' },
  { id: 'youth_first', label: 'Youth first (same budget)' },
];
