import Map, { Source, Layer } from 'react-map-gl/maplibre';
import { BASEMAP_STYLE, INITIAL_VIEW } from '../config.js';
import { blockGroupFill, facilityCircle } from '../lib/mapStyles.js';

export default function MapView({ blockGroups, facilities, sport, selectedGeoid, onSelect }) {
  const visibleFacilities = sport
    ? { ...facilities, features: facilities.features.filter((f) => f.properties.sport === sport) }
    : facilities;

  function handleClick(e) {
    const feature = e.features?.find((f) => f.layer.id === 'block-groups-fill');
    onSelect(feature ? feature.properties.geoid : null);
  }

  return (
    <Map
      initialViewState={INITIAL_VIEW}
      mapStyle={BASEMAP_STYLE}
      interactiveLayerIds={['block-groups-fill']}
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
        <Layer id="facilities-circle" type="circle" paint={facilityCircle} />
      </Source>
    </Map>
  );
}
