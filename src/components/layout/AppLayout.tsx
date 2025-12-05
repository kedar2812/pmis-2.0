import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

const AppLayout = () => {
  const [sidebarWidth, setSidebarWidth] = useState(256);

  useEffect(() => {
    const updateWidth = () => {
      const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
      setSidebarWidth(isCollapsed ? 80 : 256);
    };
    updateWidth();
    const interval = setInterval(updateWidth, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-6">
          <Breadcrumbs />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

