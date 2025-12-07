import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
};

export const LeafletMap = ({ projects, gisFeatures }) => {
  const [activeLayers, setActiveLayers] = useState({
    satellite: false,
    street: true,
    parcels: true,
    utilities: true,
  });

  // Center on Zaheerabad
  const center = [17.6816, 77.6077];
  const zoom = 13;

  return (
    <div className="relative">
      <MapContainer center={center} zoom={zoom} className="h-[600px] w-full rounded-lg z-0">
        <LayersControl position="topright">
          {activeLayers.street && (
            <LayersControl.BaseLayer checked name="Street Map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
          )}
          {activeLayers.satellite && (
            <LayersControl.BaseLayer name="Satellite View">
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
          )}
        </LayersControl>

        {/* Project Markers */}
        {projects.map((project) => (
          <Marker key={project.id} position={[project.location.lat, project.location.lng]}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm mb-1">{project.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{project.description}</p>
                <div className="text-xs space-y-1">
                  <p><strong>Status:</strong> {project.status}</p>
                  <p><strong>Progress:</strong> {project.progress}%</p>
                  <p><strong>Manager:</strong> {project.manager}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* GIS Features */}
        {gisFeatures.map((feature) => {
          if (feature.geometry.type === 'Point') {
            const [lng, lat] = feature.geometry.coordinates[0];
            return (
              <Marker key={feature.id} position={[lat, lng]}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm mb-1">{feature.properties.name}</h3>
                    <p className="text-xs text-gray-600">{feature.properties.description}</p>
                    <p className="text-xs mt-1"><strong>Type:</strong> {feature.type}</p>
                  </div>
                </Popup>
              </Marker>
            );
          } else if (feature.geometry.type === 'Polygon' && activeLayers.parcels) {
            const coords = feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
            return (
              <Polygon
                key={feature.id}
                positions={coords}
                pathOptions={{ color: '#0284c7', fillOpacity: 0.35 }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm mb-1">{feature.properties.name}</h3>
                    <p className="text-xs text-gray-600">{feature.properties.description}</p>
                  </div>
                </Popup>
              </Polygon>
            );
          } else if (feature.geometry.type === 'LineString' && activeLayers.utilities) {
            const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            return (
              <Polyline
                key={feature.id}
                positions={coords}
                pathOptions={{ color: '#f97316', weight: 3 }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm mb-1">{feature.properties.name}</h3>
                    <p className="text-xs text-gray-600">{feature.properties.description}</p>
                  </div>
                </Popup>
              </Polyline>
            );
          }
          return null;
        })}

        <MapController center={center} zoom={zoom} />
      </MapContainer>

      {/* Layer Control Widget */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-xl rounded-xl shadow-glass border border-slate-200/50 p-4">
        <h4 className="font-semibold text-sm mb-3">Layer Controls</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activeLayers.satellite}
              onChange={(e) => setActiveLayers({ ...activeLayers, satellite: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Satellite View</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activeLayers.street}
              onChange={(e) => setActiveLayers({ ...activeLayers, street: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Street Map</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activeLayers.parcels}
              onChange={(e) => setActiveLayers({ ...activeLayers, parcels: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Parcel Boundaries</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activeLayers.utilities}
              onChange={(e) => setActiveLayers({ ...activeLayers, utilities: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Utility Lines</span>
          </label>
        </div>
      </div>
    </div>
  );
};

