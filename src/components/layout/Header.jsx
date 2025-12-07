import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Bell, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';

const Header = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isCollapsed } = useSidebar();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
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

  return (
    <motion.header
      animate={{
        left: isCollapsed ? '96px' : '312px', // Sidebar width + 8px gap (collapsed: 80px + 16px, expanded: 288px + 24px)
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.5,
      }}
      className="absolute top-4 right-4 z-40 h-14 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-sm flex items-center justify-between px-4"
    >
      <div className="flex-1"></div>

      <div className="flex items-center gap-4">
        {/* Language Toggle */}
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-slate-600" />
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-32 rounded-xl border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm hover:border-slate-300 transition-colors"
          >
            <option value="en">{t('header.english')}</option>
            <option value="hi">{t('header.hindi')}</option>
            <option value="te">{t('header.telugu')}</option>
          </Select>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false); // Close profile when opening notifications
            }}
            className="p-2 rounded-xl hover:bg-slate-100/50 relative transition-colors"
          >
            <Bell size={20} className="text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent-500 rounded-full shadow-coral-glow"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass border border-slate-200/50 z-[60]">
              <div className="p-4 border-b border-slate-200/50">
                <h3 className="font-heading font-semibold text-slate-900">{t('common.notifications')}</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 text-sm text-slate-500">
                  {t('common.notifications')} - {t('common.comingSoon')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false); // Close notifications when opening profile
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100/60 transition-all duration-200 hover:scale-105"
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
                  {t('common.logout')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;


