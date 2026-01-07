import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Settings } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import GoogleTranslateWidget from '@/components/ui/GoogleTranslateWidget';
import NotificationDropdown from '@/components/communications/NotificationDropdown';
import GlobalSearch from '@/components/search/GlobalSearch';
import SettingsModal from '@/components/settings/SettingsModal';

/**
 * Header - Top navigation bar component
 * 
 * Props:
 * - isDesktop: boolean - Whether viewport is desktop size (passed from AppLayout)
 * 
 * Responsive behavior:
 * - Desktop: Positioned after sidebar with dynamic left offset
 * - Mobile: Full width with left margin for hamburger menu
 * - Hidden when mobile sidebar is open
 */
const Header = ({ isDesktop = true }) => {
  const { user, logout } = useAuth();
  const { isCollapsed, isMobileMenuOpen } = useSidebar();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    if (showNotifications || showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showProfile]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  /**
   * Calculate header left position based on viewport and sidebar state
   * - Mobile: 56px (after hamburger menu button)
   * - Desktop collapsed: 112px (96px sidebar + 16px gap)
   * - Desktop expanded: 312px (288px sidebar + 24px gap)
   */
  const getHeaderLeftPosition = () => {
    if (!isDesktop) {
      return '56px'; // Mobile: after hamburger menu
    }
    return isCollapsed ? '112px' : '312px';
  };

  // Hide header when mobile sidebar is open
  if (isMobileMenuOpen && !isDesktop) {
    return null;
  }

  return (
    <motion.header
      animate={{
        left: getHeaderLeftPosition(),
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.5,
      }}
      className="absolute top-4 right-4 z-40 h-14 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-sm flex items-center justify-between px-3 sm:px-4"
    >
      {/* Global Search */}
      <div className="flex-1 max-w-2xl  mx-4">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">

        {/* Language Toggle - Google Translate */}
        <div className="flex items-center gap-1 sm:gap-2">
          <GoogleTranslateWidget />
          {/* Divider - hidden on mobile */}
          <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1 sm:mx-2"></div>
        </div>

        {/* Settings Icon */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-xl hover:bg-slate-100/60 transition-all duration-200 hover:scale-105 group"
          title="Settings"
        >
          <Settings size={20} className="text-slate-500 group-hover:text-blue-600 group-hover:rotate-90 transition-all duration-300" />
        </button>

        {/* Notifications - Using Communications NotificationDropdown */}
        <NotificationDropdown />

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-slate-100/60 transition-all duration-200 hover:scale-105"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 flex items-center justify-center text-white text-sm font-semibold shadow-blue-glow ring-2 ring-primary-100">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-semibold text-slate-700">
              {user?.name}
            </span>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass border border-slate-200/50 z-[60]">
              <div className="p-4 border-b border-slate-200/50">
                <p className="font-semibold text-sm text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
                <p className="text-xs text-slate-400 mt-1">{user?.role}</p>
              </div>
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </motion.header>
  );
};

export default Header;
