import { FACILITY_COLORS, SCORE_COLORS, WALK_THRESHOLD_MIN } from '../config.js';

// Fill color for block groups: by access score, or by whether the selected
// sport is within a 10-minute walk. Missing values (null) render gray.
export function blockGroupFill(sport) {
  if (!sport) {
    return [
      'case',
      ['==', ['get', 'access_score'], null],
      '#bdbdbd',
      ['step', ['get', 'access_score'],
        SCORE_COLORS[0], 1, SCORE_COLORS[1], 2, SCORE_COLORS[2],
        3, SCORE_COLORS[3], 4, SCORE_COLORS[4]],
    ];
  }
  const field = `walk_min_${sport}`;
  return [
    'case',
    ['==', ['get', field], null],
    '#bdbdbd',
    ['<=', ['get', field], WALK_THRESHOLD_MIN],
    SCORE_COLORS[SCORE_COLORS.length - 1],
    SCORE_COLORS[0],
  ];
}

// Mapped (OSM) facilities: solid dark dots, hollow on school grounds, which may
// not be open to the public after hours. Model detections: lime dots with a
// dark ring. on_school_grounds is null for detections (not checked yet).
const isDetection = ['==', ['get', 'source'], 'model'];
export const facilityCircle = {
  'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 7],
  'circle-color': [
    'case',
    isDetection, FACILITY_COLORS.detection,
    ['coalesce', ['get', 'on_school_grounds'], false], '#ffffff',
    FACILITY_COLORS.mapped,
  ],
  'circle-stroke-color': FACILITY_COLORS.mapped,
  'circle-stroke-width': ['case', isDetection, 1, 1.5],
};
// Draw detections under mapped facilities where they overlap.
export const facilityLayout = { 'circle-sort-key': ['case', isDetection, 0, 1] };
