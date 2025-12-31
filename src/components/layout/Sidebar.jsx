import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  IndianRupee,
  AlertTriangle,
  Map,
  Box,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Workflow,
  Shield,
  MessageSquare,
  Clock,
  Users,
  Building2,
  PieChart,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * Sidebar Component
 * 
 * Features:
 * - Collapsible on desktop (icons only vs full labels)
 * - Slide-out drawer on mobile with overlay
 * - Auto-close when navigating on mobile
 * - Scrollbar only visible when sidebar is expanded
 * - Smooth spring animations
 */

// Sidebar width variants for liquid motion
const sidebarVariants = {
  expanded: { width: '18rem' }, // 288px
  collapsed: { width: '6rem' }, // 96px
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
  type: 'spring',
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
  const { isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, isMobile } = useSidebar();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, setIsMobileMenuOpen]);

  // Handle link click - close mobile menu
  const handleLinkClick = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  // Sidebar should appear expanded on mobile (show labels, not just icons)
  const shouldShowExpanded = isMobile ? true : !isCollapsed;
  const animationState = shouldShowExpanded ? 'expanded' : 'collapsed';

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
      permission: 'dashboard:view',
    },
    {
      id: 'edms',
      label: 'EDMS',
      icon: FileText,
      path: '/edms',
      permission: 'edms:view',
    },
    {
      id: 'communications',
      label: 'Communications',
      icon: MessageSquare,
      path: '/communications',
      permission: 'dashboard:view',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: Clock,
      path: '/approvals',
      permission: 'dashboard:view',
    },
    {
      id: 'scheduling',
      label: t('common.schedule'),
      icon: Calendar,
      path: '/scheduling',
      permission: 'scheduling:view',
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: Users,
      path: '/users',
      permission: 'users:manage',
    },
    {
      id: 'cost',
      label: t('common.cost'),
      icon: IndianRupee,
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
      id: 'procurement',
      label: 'Procurement',
      icon: FileText,
      path: '/procurement',
      permission: 'dashboard:view',
    },
    {
      id: 'cost-boq',
      label: 'BOQ Management',
      icon: FileText,
      path: '/cost/boq',
      permission: 'cost:view',
    },
    {
      id: 'cost-funds',
      label: 'Fund Management',
      icon: IndianRupee,
      path: '/cost/funds',
      permission: 'cost:view',
    },
    {
      id: 'cost-budgeting',
      label: 'Budgeting',
      icon: PieChart,
      path: '/cost/budgeting',
      permission: 'cost:view',
    },
    {
      id: 'ra-billing',
      label: 'RA Billing',
      icon: FileText,
      path: '/cost/billing',
      permission: 'dashboard:view',
    },
    {
      id: 'workflow',
      label: 'Workflow Config',
      icon: Workflow,
      path: '/workflow',
      permission: 'users:manage',
    },
    {
      id: 'audit-logs',
      label: 'Audit System',
      icon: Shield,
      path: '/admin/audit-logs',
      permission: 'users:manage',
    },
  ];

  const visibleItems = menuItems.filter((item) => hasPermission(item.permission));

  return (
    <>
      {/* Mobile menu hamburger button - only visible when sidebar is CLOSED */}
      {!isMobileMenuOpen && (
        <motion.button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-white/80 backdrop-blur-md shadow-glass border border-transparent min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={() => setIsMobileMenuOpen(true)}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          aria-label="Open menu"
        >
          <Menu size={24} className="text-slate-700" />
        </motion.button>
      )}

      {/* Sidebar */}
      <motion.aside
        layout
        initial={false}
        animate={animationState}
        variants={sidebarVariants}
        transition={sidebarTransition}
        className={cn(
          // Base styles
          'fixed top-4 left-4 z-40 h-[calc(100vh-2rem)]',
          'bg-white/80 backdrop-blur-xl border border-slate-200/50',
          'rounded-2xl shadow-glass overflow-hidden',
          // Mobile: slide in/out with smooth transition
          'transition-transform duration-300 ease-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]',
          // Desktop: always visible
          'lg:translate-x-0',
          // Print: hidden
          'print:hidden'
        )}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header with logo and collapse button */}
          <div
            className={cn(
              'border-b border-slate-200/50 flex items-center justify-between overflow-hidden flex-shrink-0',
              shouldShowExpanded ? 'p-6' : 'p-3'
            )}
          >
            <div
              className={cn(
                'flex-1 overflow-hidden',
                !shouldShowExpanded && 'flex justify-center'
              )}
            >
              {shouldShowExpanded ? (
                <motion.div
                  variants={headerTextVariants}
                  initial="collapsed"
                  animate="expanded"
                  transition={textTransition}
                  className="flex items-center gap-3 whitespace-nowrap min-w-0"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md flex-shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-heading font-bold text-primary-600 truncate">
                      PMIS
                    </h2>
                    <p className="text-xs text-slate-500 truncate">
                      Zaheerabad Industrial Area
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={textTransition}
                  className="w-full flex items-center justify-center"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Mobile close button - inside sidebar header, top right */}
            {isMobile && isMobileMenuOpen && (
              <motion.button
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden p-2 hover:bg-slate-100/50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                whileTap={{ scale: 0.9 }}
                aria-label="Close menu"
              >
                <X size={24} className="text-slate-600" />
              </motion.button>
            )}

            {/* Collapse/Expand button - desktop only */}
            <motion.button
              layout
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'hidden lg:flex rounded-lg hover:bg-slate-100/50 transition-colors flex-shrink-0',
                isCollapsed ? 'p-1.5' : 'p-2'
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
            >
              {isCollapsed ? (
                <ChevronRight size={18} className="text-slate-600" />
              ) : (
                <ChevronLeft size={20} className="text-slate-600" />
              )}
            </motion.button>
          </div>

          {/* Navigation - Scrollbar only visible when expanded */}
          <nav
            className={cn(
              'flex-1 p-4 space-y-2',
              // Only show scrollbar when sidebar is expanded
              shouldShowExpanded
                ? 'overflow-y-auto overflow-x-hidden'
                : 'overflow-hidden'
            )}
          >
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
                    onClick={handleLinkClick}
                    className={cn(
                      'flex items-center gap-3 rounded-xl transition-all duration-200 overflow-hidden',
                      'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
                      isActive
                        ? 'bg-gradient-to-r from-primary-50 to-blue-50 text-primary-700 font-semibold shadow-sm pl-3 py-3 pr-4'
                        : 'text-slate-700 hover:bg-slate-100/50 hover:text-primary-600 px-4 py-3'
                    )}
                    title={!shouldShowExpanded ? item.label : undefined}
                    aria-label={item.label}
                  >
                    {/* Active indicator pill */}
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
                      {shouldShowExpanded && (
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

      {/* Backdrop overlay for mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
            onClick={() => setisMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
