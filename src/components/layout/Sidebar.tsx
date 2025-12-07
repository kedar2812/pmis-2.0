import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSidebar } from '@/contexts/SidebarContext';
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
  FolderOpen,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      label: t('common.dashboard'),
      icon: LayoutDashboard,
      path: '/dashboard',
      permission: 'dashboard:view',
    },
    {
      id: 'projects',
      label: t('common.projects'),
      icon: FolderOpen,
      path: '/projects',
      permission: 'dashboard:view', // All users who can view dashboard can view projects
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
      <motion.button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/80 backdrop-blur-md shadow-glass"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        {isMobileOpen ? <X size={24} className="text-slate-700" /> : <Menu size={24} className="text-slate-700" />}
      </motion.button>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 256,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'fixed top-4 left-4 z-40 h-[calc(100vh-2rem)]',
          'bg-white/80 backdrop-blur-xl border border-slate-200/50',
          'rounded-2xl shadow-glass',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-200/50 flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!isCollapsed ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <h2 className="text-xl font-heading font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                    {t('sidebar.pmisZia')}
                  </h2>
                  <p className="text-sm text-slate-500">{t('sidebar.programmeManagement')}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex justify-center"
                >
                  <h2 className="text-xl font-heading font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">P</h2>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100/50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
            >
              {isCollapsed ? <ChevronRight size={20} className="text-slate-600" /> : <ChevronLeft size={20} className="text-slate-600" />}
            </motion.button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
                      isActive
                        ? 'bg-gradient-to-r from-primary-50 to-blue-50 text-primary-700 font-semibold shadow-sm pl-3 py-3 pr-4'
                        : 'text-slate-700 hover:bg-slate-100/50 hover:text-primary-600 px-4 py-3'
                    )}
                    title={isCollapsed ? item.label : undefined}
                    aria-label={item.label}
                  >
                    {/* Internal active indicator pill */}
                    {isActive && (
                      <motion.div
                        className="h-6 w-1 bg-gradient-to-b from-primary-600 to-primary-700 rounded-full shadow-blue-glow flex-shrink-0"
                        layoutId="activeIndicator"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      />
                    )}
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
                </motion.div>
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
      </motion.aside>
    </>
  );
};

export default Sidebar;

