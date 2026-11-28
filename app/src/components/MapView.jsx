import { useEffect, useRef } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import { BASEMAP_STYLE, INITIAL_VIEW } from '../config.js';
import { boundsOf } from '../lib/bounds.js';
import { blockGroupFill, facilityCircle, facilityLayout } from '../lib/mapStyles.js';

export default function MapView({
  blockGroups, facilities, sport, showDetections, bands, selectedGeoid, selectedFacilityId, onSelect, onSelectFacility,
}) {
  const mapRef = useRef(null);
  usePrintFit(mapRef, blockGroups);

  // Filters change only which dots are drawn, never the access scores.
  const visibleFacilities = {
    ...facilities,
    features: facilities.features.filter((f) => {
      const p = f.properties;
      if (sport && p.sport !== sport) return false;
      if (p.source !== 'model') return true;
      return showDetections && bands.has(p.confidence_band);
    }),
  };

  // A tap on a facility dot opens the facility; otherwise it opens the block group.
  function handleClick(e) {
    const facility = e.features?.find((f) => f.layer.id === 'facilities-circle');
    if (facility) {
      onSelectFacility(facility.properties.facility_id);
      return;
    }
    const feature = e.features?.find((f) => f.layer.id === 'block-groups-fill');
    onSelect(feature ? feature.properties.geoid : null);
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW}
      mapStyle={BASEMAP_STYLE}
      interactiveLayerIds={['block-groups-fill', 'facilities-circle']}
      onClick={handleClick}
      style={{ position: 'absolute', inset: 0 }}
      id="map"
      // Keeps the map image available when the page is printed.
      preserveDrawingBuffer
      attributionControl={{ compact: true }}
    >
      <Source id="block-groups" type="geojson" data={blockGroups}>
        <Layer
          id="block-groups-fill"
          type="fill"
          paint={{ 'fill-color': blockGroupFill(sport), 'fill-opacity': 0.55 }}
        />
        <Layer
          id="block-groups-line"
          type="line"
          paint={{
            'line-color': ['case', ['==', ['get', 'geoid'], selectedGeoid ?? ''], '#111111', '#ffffff'],
            'line-width': ['case', ['==', ['get', 'geoid'], selectedGeoid ?? ''], 2.5, 0.4],
          }}
        />
      </Source>
      <Source id="facilities" type="geojson" data={visibleFacilities}>
        <Layer id="facilities-circle" type="circle" paint={facilityCircle} layout={facilityLayout} />
        <Layer
          id="facilities-selected"
          type="circle"
          filter={['==', ['get', 'facility_id'], selectedFacilityId ?? '']}
          paint={{
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 7, 15, 12],
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-color': '#111111',
            'circle-stroke-width': 2.5,
          }}
        />
      </Source>
    </Map>
  );
}

// Printed map size; must match #map in the print styles. It fits Letter and A4.
const PRINT_SIZE = { width: '180mm', height: '120mm' };

// Before printing, draw the map at its printed size with the whole city in
// view; afterwards, restore the on-screen size and view. The size is set here
// as well as in CSS because browsers fire these events before print layout.
function usePrintFit(mapRef, blockGroups) {
  useEffect(() => {
    let saved = null;
    function before() {
      const map = mapRef.current?.getMap();
      if (!map || saved) return;
      saved = { center: map.getCenter(), zoom: map.getZoom() };
      Object.assign(map.getContainer().style, PRINT_SIZE);
      map.resize();
      map.fitBounds(boundsOf(blockGroups), { padding: 16, animate: false });
      map.redraw();
    }
    function after() {
      const map = mapRef.current?.getMap();
      if (!map || !saved) return;
      Object.assign(map.getContainer().style, { width: '', height: '' });
      map.resize();
      map.jumpTo(saved);
      saved = null;
    }
    const mq = window.matchMedia('print');
    const onChange = (e) => (e.matches ? before() : after());
    mq.addEventListener('change', onChange);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [mapRef, blockGroups]);
}
