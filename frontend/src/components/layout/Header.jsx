import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Settings, Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import GoogleTranslateWidget from '@/components/ui/GoogleTranslateWidget';
import LanguageDropdown from '@/components/ui/LanguageDropdown';
import NotificationDropdown from '@/components/communications/NotificationDropdown';
import ThemeToggle from '@/components/ui/ThemeToggle';
import SettingsModal from '@/components/settings/SettingsModal';
import GlobalSearchModal from '@/components/search/GlobalSearchModal';

const Header = ({ isDesktop = true }) => {
  const { user, logout } = useAuth();
  const { isCollapsed, isMobileMenuOpen } = useSidebar();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications, showProfile]);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getHeaderLeftPosition = () => {
    if (!isDesktop) return '56px';
    return isCollapsed ? '112px' : '312px';
  };

  if (isMobileMenuOpen && !isDesktop) return null;

  return (
    <>
      <motion.header
        animate={{ left: getHeaderLeftPosition() }}
        transition={{ type: 'spring', stiffness: 200, damping: 28, mass: 0.6 }}
        className="absolute top-4 right-4 z-40 h-14 bg-app-card/90 backdrop-blur-xl border border-app-subtle rounded-2xl shadow-sm flex items-center justify-between px-3 sm:px-4"
      >
        {/* Search bar trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2.5 h-9 px-4 rounded-xl bg-app-layer-2/60 hover:bg-app-layer-2 border border-gray-300 dark:border-neutral-600 transition-colors duration-200 cursor-text group flex-1 max-w-xs sm:max-w-sm mr-2"
        >
          <Search size={15} className="text-app-muted group-hover:text-primary-500 transition-colors flex-shrink-0" />
          <span className="text-sm text-app-muted truncate hidden sm:inline">Search anything...</span>
          <span className="text-sm text-app-muted truncate sm:hidden">Search...</span>
          <kbd className="hidden sm:inline-flex ml-auto items-center gap-0.5 px-1.5 py-0.5 rounded bg-app-card border border-app-subtle text-[10px] font-mono text-app-muted">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden"><GoogleTranslateWidget /></div>
          <LanguageDropdown />
          <ThemeToggle />
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl hover:bg-app-layer-2 transition-all duration-200 hover:scale-105 group" title="Settings">
            <Settings size={20} className="text-app-muted group-hover:text-primary-600 transition-all duration-300" />
          </button>
          <NotificationDropdown />
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-app-layer-2 transition-all duration-200 hover:scale-105"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 flex items-center justify-center text-white text-sm font-semibold shadow-lg ring-2 ring-primary-100 dark:ring-primary-500/30">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-sm font-semibold text-app-text">{user?.name}</span>
            </button>
            {showProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-app-card backdrop-blur-xl rounded-2xl shadow-xl border border-app-subtle z-[60]">
                <div className="p-4 border-b border-app-subtle">
                  <p className="font-semibold text-sm text-app-heading">{user?.name}</p>
                  <p className="text-xs text-app-muted">{user?.email}</p>
                  <p className="text-xs text-app-muted mt-1">{user?.role}</p>
                </div>
                <div className="p-2">
                  <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>Logout</Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </motion.header>

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;
