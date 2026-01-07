import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { gisFeatures, projects } from '@/mock';
import { MapPin } from 'lucide-react';
import { LeafletMap } from '@/components/gis/LeafletMap';

const GIS = () => {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">GIS Mapping</h1>
        <p className="text-gray-600 mt-1">Geospatial project data and location analytics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Locations Map</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Interactive map showing all project sites and key infrastructure points
          </p>
        </CardHeader>
        <CardContent>
          <LeafletMap projects={projects} gisFeatures={gisFeatures} />
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






