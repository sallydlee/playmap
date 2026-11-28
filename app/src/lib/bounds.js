// Bounding box [[west, south], [east, north]] of a GeoJSON FeatureCollection.
export function boundsOf(fc) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const visit = (c) => {
    if (typeof c[0] === 'number') {
      if (c[0] < w) w = c[0];
      if (c[0] > e) e = c[0];
      if (c[1] < s) s = c[1];
      if (c[1] > n) n = c[1];
    } else c.forEach(visit);
  };
  fc.features.forEach((f) => f.geometry && visit(f.geometry.coordinates));
  return [[w, s], [e, n]];
}
