import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { gisFeatures, projects } from '@/mock';
import { MapPin } from 'lucide-react';

const GIS = () => {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current) {
      // Initialize Leaflet map
      import('leaflet').then((L) => {
        const map = L.default.map(mapRef.current!).setView([17.6868, 77.6093], 13);

        // Add OpenStreetMap tiles
        L.default
          .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
          })
          .addTo(map);

        // Add markers for projects
        projects.forEach((project) => {
          L.default
            .marker([project.location.lat, project.location.lng])
            .addTo(map)
            .bindPopup(`<b>${project.name}</b><br>${project.description}`);
        });

        // Add GIS features
        gisFeatures.forEach((feature) => {
          if (feature.geometry.type === 'Point') {
            const [lng, lat] = feature.geometry.coordinates[0];
            L.default
              .marker([lat, lng])
              .addTo(map)
              .bindPopup(`<b>${feature.properties.name}</b><br>${feature.properties.description}`);
          } else if (feature.geometry.type === 'Polygon') {
            const coords = feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
            L.default
              .polygon(coords as [number, number][])
              .addTo(map)
              .bindPopup(`<b>${feature.properties.name}</b><br>${feature.properties.description}`);
          } else if (feature.geometry.type === 'LineString') {
            const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            L.default
              .polyline(coords as [number, number][])
              .addTo(map)
              .bindPopup(`<b>${feature.properties.name}</b><br>${feature.properties.description}`);
          }
        });

        return () => {
          map.remove();
        };
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.gis')}</h1>
        <p className="text-gray-600 mt-1">Geographic Information System & Spatial Mapping</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Locations Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={mapRef} className="h-[600px] w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* GIS Features List */}
      <Card>
        <CardHeader>
          <CardTitle>GIS Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gisFeatures.map((feature) => (
              <div
                key={feature.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-primary-600" size={20} />
                  <h3 className="font-medium">{feature.properties.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">{feature.properties.description}</p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                    {feature.type}
                  </span>
                  {feature.properties.projectId && (
                    <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                      Project: {feature.properties.projectId}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GIS;


