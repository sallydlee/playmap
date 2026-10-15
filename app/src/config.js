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

export const SPORTS = [
  { id: 'tennis', label: 'Tennis' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'baseball_softball', label: 'Baseball / softball' },
  { id: 'football', label: 'Football' },
];

// A 10-minute walk, the goals document's access threshold.
export const WALK_THRESHOLD_MIN = 10;

// Access score 0 (no facility types within a 10-minute walk) to 5 (all five).
// Low scores are the warm colors so gaps stand out.
export const SCORE_COLORS = ['#b2182b', '#ef8a62', '#fddbc7', '#d1e5f0', '#67a9cf', '#2166ac'];
