import Map, { Source, Layer } from 'react-map-gl/maplibre';
import { BASEMAP_STYLE, INITIAL_VIEW } from '../config.js';
import { blockGroupFill, facilityCircle, facilityLayout } from '../lib/mapStyles.js';

export default function MapView({
  blockGroups, facilities, sport, showDetections, selectedGeoid, selectedFacilityId, onSelect, onSelectFacility,
}) {
  const visibleFacilities = {
    ...facilities,
    features: facilities.features.filter((f) =>
      (!sport || f.properties.sport === sport) && (showDetections || f.properties.source !== 'model')),
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
      initialViewState={INITIAL_VIEW}
      mapStyle={BASEMAP_STYLE}
      interactiveLayerIds={['block-groups-fill', 'facilities-circle']}
      onClick={handleClick}
      style={{ position: 'absolute', inset: 0 }}
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
