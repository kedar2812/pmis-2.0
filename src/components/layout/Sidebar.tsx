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
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Sidebar width variants for liquid motion
const sidebarVariants = {
  expanded: { width: '18rem' }, // 288px - wider to fit "Integrated Dashboard"
  collapsed: { width: '5rem' }, // 80px
};

// Text label variants for smooth fade/slide
const textVariants = {
  expanded: {
    opacity: 1,
    x: 0,
    display: 'block',
  },
  collapsed: {
    opacity: 0,
    x: -10,
    transitionEnd: { display: 'none' },
  },
};

// Header text variants
const headerTextVariants = {
  expanded: {
    opacity: 1,
    x: 0,
  },
  collapsed: {
    opacity: 0,
    x: -10,
  },
};

// Transition timing - optimized for performance
const sidebarTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.5,
};

const textTransition = {
  duration: 0.15,
};

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
    {
      id: 'workflow',
      label: 'Workflow Config',
      icon: Workflow,
      path: '/workflow',
      permission: 'users:manage', // Only admins
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
        layout
        initial={false}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        transition={sidebarTransition}
        className={cn(
          'fixed top-4 left-4 z-30 h-[calc(100vh-2rem)]',
          'bg-white/80 backdrop-blur-xl border border-slate-200/50',
          'rounded-2xl shadow-glass overflow-hidden',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <div className={cn(
            "border-b border-slate-200/50 flex items-center justify-between overflow-hidden",
            isCollapsed ? "p-3" : "p-6"
          )}>
            <div className={cn(
              "flex-1 overflow-hidden",
              isCollapsed && "flex justify-center"
            )}>
              {!isCollapsed ? (
                <motion.div
                  variants={headerTextVariants}
                  initial="collapsed"
                  animate="expanded"
                  transition={textTransition}
                  className="whitespace-nowrap min-w-0"
                >
                  <h2 className="text-xl font-heading font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent truncate">
                    {t('sidebar.pmisZia')}
                  </h2>
                  <p className="text-sm text-slate-500 truncate">{t('sidebar.programmeManagement')}</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={textTransition}
                  className="w-full flex items-center justify-center"
                >
                  <h2 className="text-lg font-heading font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent leading-none">P</h2>
                </motion.div>
              )}
            </div>
            <motion.button
              layout
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "hidden lg:flex rounded-lg hover:bg-slate-100/50 transition-colors flex-shrink-0",
                isCollapsed ? "p-1.5" : "p-2"
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
            >
              {isCollapsed ? <ChevronRight size={18} className="text-slate-600" /> : <ChevronLeft size={20} className="text-slate-600" />}
            </motion.button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl transition-all duration-200 overflow-hidden',
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
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      />
                    )}
                    <Icon size={20} className="flex-shrink-0" />
                    <AnimatePresence mode="wait">
                      {!isCollapsed && (
                        <motion.span
                          key="text"
                          variants={textVariants}
                          initial="collapsed"
                          animate="expanded"
                          exit="collapsed"
                          transition={textTransition}
                          className="whitespace-nowrap"
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
      </motion.aside>

      {/* Overlay for mobile - must be OUTSIDE the sidebar */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;

