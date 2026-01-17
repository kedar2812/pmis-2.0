import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Settings } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import GoogleTranslateWidget from '@/components/ui/GoogleTranslateWidget';
import LanguageDropdown from '@/components/ui/LanguageDropdown';
import NotificationDropdown from '@/components/communications/NotificationDropdown';
import ThemeToggle from '@/components/ui/ThemeToggle';
import SettingsModal from '@/components/settings/SettingsModal';
import GlobalSearchBar from '@/components/search/GlobalSearchBar';

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
 * 
 * Dark Mode: Uses semantic design tokens for automatic theme switching
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
      className="absolute top-4 right-4 z-40 h-14 bg-app-card/90 backdrop-blur-xl border border-app-subtle rounded-2xl shadow-sm flex items-center justify-between px-3 sm:px-4"
    >
      {/* Global Search Bar - Full bar on desktop, icon on mobile */}
      <GlobalSearchBar isDesktop={isDesktop} />

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Google Translate Widget (hidden) */}
        <div className="hidden">
          <GoogleTranslateWidget />
        </div>

        {/* Language Dropdown - Beautiful redesigned */}
        <LanguageDropdown />

        {/* Theme Toggle - NEW */}
        <ThemeToggle />

        {/* Settings Icon */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-xl hover:bg-app-layer-2 transition-all duration-200 hover:scale-105 group"
          title="Settings"
        >
          <Settings size={20} className="text-app-muted group-hover:text-primary-600 transition-all duration-300" />
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
            className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-app-layer-2 transition-all duration-200 hover:scale-105"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 flex items-center justify-center text-white text-sm font-semibold shadow-lg ring-2 ring-primary-100 dark:ring-primary-500/30">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-semibold text-app-text">
              {user?.name}
            </span>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-app-card backdrop-blur-xl rounded-2xl shadow-xl border border-app-subtle z-[60]">
              <div className="p-4 border-b border-app-subtle">
                <p className="font-semibold text-sm text-app-heading">{user?.name}</p>
                <p className="text-xs text-app-muted">{user?.email}</p>
                <p className="text-xs text-app-muted mt-1">{user?.role}</p>
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
