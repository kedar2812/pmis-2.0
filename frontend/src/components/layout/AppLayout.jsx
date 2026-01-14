import { Suspense, useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSidebar } from '@/contexts/SidebarContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PageLoading } from '@/components/ui/Loading';

/**
 * AppLayout - Main application layout component
 * 
 * Handles responsive layout behavior:
 * - Desktop (≥1024px): Content has left padding for sidebar
 * - Mobile (<1024px): Content fills full width, sidebar overlays
 * 
 * Uses React state to track viewport size for smooth animations
 */
const AppLayout = () => {
  const location = useLocation();
  const { isCollapsed } = useSidebar();



  // Track if we're on desktop viewport for responsive layout
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  // Memoized resize handler for performance
  const handleResize = useCallback(() => {
    setIsDesktop(window.innerWidth >= 1024);
  }, []);

  // Listen for viewport changes
  useEffect(() => {
    // Set initial value
    handleResize();

    // Add resize listener with debounce for performance
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  // Calculate content padding based on viewport and sidebar state
  const getContentPadding = () => {
    if (!isDesktop) {
      return '0px'; // Mobile: no sidebar offset
    }
    // Desktop: offset based on sidebar state
    // Collapsed: 96px (sidebar) + 8px (gap) = 104px
    // Expanded: 288px (sidebar) + 16px (gap) = 304px
    return isCollapsed ? '104px' : '304px';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <motion.div
        animate={{
          paddingLeft: getContentPadding(),
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.5,
        }}
        className="relative min-h-screen"
      >
        <Header isDesktop={isDesktop} />
        <main className="px-4 sm:px-6 pb-4 sm:pb-6" style={{ paddingTop: '88px' }}>
          <Breadcrumbs />
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
          >
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <PageLoading text="Loading..." />
              </div>
            }>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
};

export default AppLayout;
