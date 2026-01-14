import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Check, Search, Star } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';

// Popular languages in specified order
const POPULAR_LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'ur', name: 'Urdu', native: 'اردو' },
];

// Get popular language codes for filtering
const popularCodes = POPULAR_LANGUAGES.map(l => l.code);

/**
 * Trigger Google Translate programmatically
 * Uses multiple methods to ensure translation works even after bar is closed
 */
const triggerTranslation = (langCode) => {
    // Method 1: Try the combo box
    const googleSelect = document.querySelector('.goog-te-combo');
    if (googleSelect) {
        googleSelect.value = langCode;
        googleSelect.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    // Method 2: Try using the Google Translate API directly
    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        try {
            // Re-initialize if needed
            const element = document.getElementById('google_translate_element');
            if (element && !element.querySelector('.goog-te-combo')) {
                new window.google.translate.TranslateElement(
                    { pageLanguage: 'en', autoDisplay: false },
                    'google_translate_element'
                );
                // Try again after re-initialization
                setTimeout(() => {
                    const combo = document.querySelector('.goog-te-combo');
                    if (combo) {
                        combo.value = langCode;
                        combo.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, 100);
            }
            return true;
        } catch (e) {
            console.error('Google Translate re-init failed:', e);
        }
    }

    // Method 3: Set cookies (translation will apply on next page load, NO forced reload)
    if (langCode === 'en') {
        // Reset to English by removing the translation cookie
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
    } else {
        // Set translation cookie
        document.cookie = `googtrans=/en/${langCode}; path=/;`;
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${window.location.hostname}`;
    }

    return false;
};


/**
 * LanguageDropdown - Beautiful, modern language selector
 * 
 * Features:
 * - Two sections: Popular & All Languages
 * - Excluded from Google Translate (always in English)
 * - Robust translation triggering
 */
const LanguageDropdown = () => {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Get current language info
    const currentLang = POPULAR_LANGUAGES.find(l => l.code === language) ||
        SUPPORTED_LANGUAGES.find(l => l.code === language) ||
        { code: 'en', name: 'English', native: 'English' };

    // Filter languages based on search
    const filteredPopular = POPULAR_LANGUAGES.filter(lang =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.native.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const allLanguages = SUPPORTED_LANGUAGES.filter(l => !popularCodes.includes(l.code));
    const filteredAll = allLanguages.filter(lang =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.native.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSelect = (langCode) => {
        setLanguage(langCode);
        setIsOpen(false);
        setSearchQuery('');

        // Trigger translation after a brief delay
        setTimeout(() => {
            triggerTranslation(langCode);
        }, 100);
    };

    const LanguageItem = ({ lang, isActive }) => (
        <motion.button
            onClick={() => handleSelect(lang.code)}
            className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-left
        transition-all duration-150 rounded-lg mx-1
        ${isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-slate-50 text-slate-700'}
      `}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{lang.native}</span>
                <span className="text-xs text-slate-400 ml-2">{lang.name}</span>
            </div>
            {isActive && (
                <Check size={16} className="text-primary-500 flex-shrink-0" />
            )}
        </motion.button>
    );

    return (
        // notranslate class prevents Google Translate from translating this component
        <div className="relative notranslate" ref={dropdownRef} translate="no">
            {/* Trigger Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center gap-2 px-3 py-2 
          rounded-xl border transition-all duration-200
          ${isOpen
                        ? 'bg-primary-50 border-primary-200 text-primary-700'
                        : 'bg-white/80 border-slate-200/60 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}
        `}
                whileTap={{ scale: 0.98 }}
            >
                <Globe size={16} className={isOpen ? 'text-primary-500' : 'text-slate-500'} />
                <span className="text-sm font-medium hidden sm:block">
                    {currentLang.native}
                </span>
                <span className="text-sm font-medium sm:hidden">
                    {currentLang.code.toUpperCase()}
                </span>
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden z-[100]"
                    >
                        {/* Search Input */}
                        <div className="p-3 border-b border-slate-100">
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl">
                                <Search size={16} className="text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search languages..."
                                    className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Language List */}
                        <div className="max-h-80 overflow-y-auto overscroll-contain">
                            {/* Popular Section */}
                            {filteredPopular.length > 0 && (
                                <div className="py-2">
                                    <div className="flex items-center gap-2 px-4 py-2">
                                        <Star size={12} className="text-amber-500" />
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            Popular
                                        </span>
                                    </div>
                                    <div className="px-2">
                                        {filteredPopular.map((lang) => (
                                            <LanguageItem
                                                key={lang.code}
                                                lang={lang}
                                                isActive={lang.code === language}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            {filteredPopular.length > 0 && filteredAll.length > 0 && (
                                <div className="mx-4 my-2 border-t border-slate-100" />
                            )}

                            {/* All Languages Section */}
                            {filteredAll.length > 0 && (
                                <div className="py-2">
                                    <div className="flex items-center gap-2 px-4 py-2">
                                        <Globe size={12} className="text-slate-400" />
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            All Languages
                                        </span>
                                    </div>
                                    <div className="px-2">
                                        {filteredAll.map((lang) => (
                                            <LanguageItem
                                                key={lang.code}
                                                lang={lang}
                                                isActive={lang.code === language}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No results */}
                            {filteredPopular.length === 0 && filteredAll.length === 0 && (
                                <div className="px-4 py-8 text-center">
                                    <Globe size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-500">No languages found</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                            <p className="text-xs text-slate-400 text-center">
                                Powered by Google Translate
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LanguageDropdown;
