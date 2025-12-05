import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  DollarSign,
  AlertTriangle,
  Map,
  Box,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const { accessibleModules, hasPermission } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const menuItems = [
    {
      id: 'dashboard',
      label: t('common.dashboard'),
      icon: LayoutDashboard,
      path: '/dashboard',
      permission: 'dashboard:view',
    },
    {
      id: 'edms',
      label: t('common.documents'),
      icon: FileText,
      path: '/edms',
      permission: 'edms:view',
    },
    {
      id: 'scheduling',
      label: t('common.schedule'),
      icon: Calendar,
      path: '/scheduling',
      permission: 'scheduling:view',
    },
    {
      id: 'cost',
      label: t('common.cost'),
      icon: DollarSign,
      path: '/cost',
      permission: 'cost:view',
    },
    {
      id: 'risk',
      label: t('common.risk'),
      icon: AlertTriangle,
      path: '/risk',
      permission: 'risk:view',
    },
    {
      id: 'gis',
      label: t('common.gis'),
      icon: Map,
      path: '/gis',
      permission: 'gis:view',
    },
    {
      id: 'bim',
      label: t('common.bim'),
      icon: Box,
      path: '/bim',
      permission: 'bim:view',
    },
  ];

  const visibleItems = menuItems.filter((item) => hasPermission(item.permission));

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 256,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!isCollapsed ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <h2 className="text-xl font-bold text-primary-950">PMIS ZIA</h2>
                  <p className="text-sm text-gray-600">Programme Management</p>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex justify-center"
                >
                  <h2 className="text-xl font-bold text-primary-950">P</h2>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
                    isActive
                      ? 'bg-primary-100 text-primary-700 font-medium shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-primary-700'
                  )}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Overlay for mobile */}
        {isMobileOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </aside>
    </>
  );
};

export default Sidebar;

