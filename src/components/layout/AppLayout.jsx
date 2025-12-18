import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/contexts/SidebarContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

const AppLayout = () => {
  const location = useLocation();
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <motion.div
        animate={{
          paddingLeft: isCollapsed ? '104px' : '304px', // 96px (collapsed) + 8px (gap), 288px (expanded) + 16px (gap)
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.5,
        }}
        className="lg:block relative"
      >
        <Header />
        <main className="p-6 pt-20">
          <Breadcrumbs />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: 'easeInOut',
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
};

export default AppLayout;







