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
          paddingLeft: isCollapsed ? '88px' : '272px', // 80px (collapsed) + 8px (gap), 256px (expanded) + 16px (gap)
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 40,
          mass: 0.3,
        }}
        className="lg:block relative"
      >
        <Header />
        <main className="p-6 pt-20">
          <Breadcrumbs />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ 
                type: 'spring',
                stiffness: 260,
                damping: 20,
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

