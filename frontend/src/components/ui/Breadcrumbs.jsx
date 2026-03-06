import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export const Breadcrumbs = () => {
  const location = useLocation();
  const { t } = useLanguage();

  // Custom dynamic label registry for overriding UUIDs
  const [dynamicLabels, setDynamicLabels] = useState({});

  useEffect(() => {
    const handleSetLabel = (e) => {
      setDynamicLabels(prev => ({ ...prev, [e.detail.path]: e.detail.label }));
    };
    window.addEventListener('set-breadcrumb-label', handleSetLabel);
    return () => window.removeEventListener('set-breadcrumb-label', handleSetLabel);
  }, []);

  const pathMap = {
    '/dashboard': t('common.dashboard'),

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

    // UUID regex to detect dynamically generated IDs
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    paths.forEach((path, index) => {
      // Logic to ignore purely technical/action route segments that don't have separate pages
      if (path === 'view' || path === 'edit' || path === 'create') {
        return; // Skip adding these as clickable breadcrumbs
      }

      const fullPath = '/' + paths.slice(0, index + 1).join('/');

      // 1. Check if we have a dynamically registered label for this EXACT path
      let label = dynamicLabels[fullPath];

      if (!label) {
        // 2. Fall back to static map or capitalization
        label = pathMap[fullPath] || path.charAt(0).toUpperCase() + path.slice(1);

        // 3. If the path is a UUID, fallback to "Details" if no dynamic label is set
        if (uuidRegex.test(path)) {
          label = "Details";
        }
      }

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
                  'flex items-center text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200',
                  isLast && 'text-slate-900 dark:text-white font-medium'
                )}
                aria-label="Home"
              >
                <Home size={16} />
              </Link>
            ) : (
              <>
                <ChevronRight size={16} className="text-slate-400 dark:text-neutral-600 mx-2" />
                {isLast ? (
                  <span className="text-slate-900 dark:text-white font-medium">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.path || '#'}
                    className="text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors"
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







