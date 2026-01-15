import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { gisFeatures, projects } from '@/mock';
import { MapPin } from 'lucide-react';
import { LeafletMap } from '@/components/gis/LeafletMap';

const GIS = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('common.gis')}</h1>
        <p className="text-gray-600 dark:text-neutral-400 mt-1">{t('gis.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('gis.projectLocationsMap')}</CardTitle>
          <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
            {t('gis.mapDescription')}
          </p>
        </CardHeader>
        <CardContent>
          <LeafletMap projects={projects} gisFeatures={gisFeatures} />
        </CardContent>
      </Card>

      {/* GIS Features List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('gis.gisFeatures')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gisFeatures.map((feature) => (
              <div
                key={feature.id}
                className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="text-primary-600" size={20} />
                  <h3 className="font-medium dark:text-white">{feature.properties.name}</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-2">{feature.properties.description}</p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                    {feature.type}
                  </span>
                  {feature.properties.projectId && (
                    <span className="px-2 py-1 bg-gray-200 dark:bg-neutral-700 dark:text-neutral-300 rounded text-xs">
                      {t('common.project')}: {feature.properties.projectId}
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






