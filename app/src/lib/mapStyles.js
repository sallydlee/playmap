import { SCORE_COLORS, WALK_THRESHOLD_MIN } from '../config.js';

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
        3, SCORE_COLORS[3], 4, SCORE_COLORS[4], 5, SCORE_COLORS[5]],
    ];
  }
  const field = `walk_min_${sport}`;
  return [
    'case',
    ['==', ['get', field], null],
    '#bdbdbd',
    ['<=', ['get', field], WALK_THRESHOLD_MIN],
    SCORE_COLORS[5],
    SCORE_COLORS[0],
  ];
}

export const facilityCircle = {
  'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 7],
  'circle-color': ['case', ['get', 'is_public'], '#1f3a2e', '#ffffff'],
  'circle-stroke-color': '#1f3a2e',
  'circle-stroke-width': 1.5,
};
