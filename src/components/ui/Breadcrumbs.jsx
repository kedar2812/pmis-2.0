import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export const Breadcrumbs = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const pathMap = {
    '/dashboard': t('common.dashboard'),
    '/edms': t('common.documents'),
    '/scheduling': t('common.schedule'),
    '/cost': t('common.cost'),
    '/risk': t('common.risk'),
    '/gis': t('common.gis'),
    '/bim': t('common.bim'),
  };

  const generateBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: t('common.dashboard'), path: '/dashboard' }];

    if (paths.length === 0) return breadcrumbs;

    paths.forEach((path, index) => {
      const fullPath = '/' + paths.slice(0, index + 1).join('/');
      const label = pathMap[fullPath] || path.charAt(0).toUpperCase() + path.slice(1);
      breadcrumbs.push({
        label,
        path: index === paths.length - 1 ? undefined : fullPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm mb-4" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={crumb.path || index} className="flex items-center">
            {index === 0 ? (
              <Link
                to={crumb.path || '#'}
                className={cn(
                  'flex items-center text-gray-500 hover:text-gray-700',
                  isLast && 'text-gray-900 font-medium'
                )}
                aria-label="Home"
              >
                <Home size={16} />
              </Link>
            ) : (
              <>
                <ChevronRight size={16} className="text-gray-400 mx-2" />
                {isLast ? (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.path || '#'}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
};


