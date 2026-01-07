import { useEffect, useState, useRef, useMemo } from 'react';
import { Globe, Search, Check, ChevronDown, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIGURATION ---

// 1. Popular Languages in user-specified order
const POPULAR_LANGUAGES_ORDER = [
    'en', // English
    'hi', // Hindi
    'mr', // Marathi
    'ta', // Tamil
    'te', // Telugu
    'kn', // Kannada
    'ml', // Malayalam
    'pa', // Punjabi
    'gu', // Gujarati
    'bn', // Bengali
];

// 2. Full Language List (Name + Native Name)
const ALL_LANGUAGES = [
    { code: 'af', name: 'Afrikaans', native: 'Afrikaans' },
    { code: 'sq', name: 'Albanian', native: 'Shqip' },
    { code: 'am', name: 'Amharic', native: 'አማርኛ' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
    { code: 'hy', name: 'Armenian', native: 'Հայերեն' },
    { code: 'az', name: 'Azerbaijani', native: 'Azərbaycan' },
    { code: 'eu', name: 'Basque', native: 'Euskara' },
    { code: 'be', name: 'Belarusian', native: 'Беларуская' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'bs', name: 'Bosnian', native: 'Bosanski' },
    { code: 'bg', name: 'Bulgarian', native: 'Български' },
    { code: 'ca', name: 'Catalan', native: 'Català' },
    { code: 'ceb', name: 'Cebuano', native: 'Cebuano' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文' },
    { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
    { code: 'hr', name: 'Croatian', native: 'Hrvatski' },
    { code: 'cs', name: 'Czech', native: 'Čeština' },
    { code: 'da', name: 'Danish', native: 'Dansk' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands' },
    { code: 'en', name: 'English', native: 'English' },
    { code: 'et', name: 'Estonian', native: 'Eesti' },
    { code: 'fi', name: 'Finnish', native: 'Suomi' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'gl', name: 'Galician', native: 'Galego' },
    { code: 'ka', name: 'Georgian', native: 'ქართული' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'el', name: 'Greek', native: 'Ελληνικά' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'ha', name: 'Hausa', native: 'Hausa' },
    { code: 'he', name: 'Hebrew', native: 'עברית' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'hu', name: 'Hungarian', native: 'Magyar' },
    { code: 'is', name: 'Icelandic', native: 'Íslenska' },
    { code: 'ig', name: 'Igbo', native: 'Igbo' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
    { code: 'ga', name: 'Irish', native: 'Gaeilge' },
    { code: 'it', name: 'Italian', native: 'Italiano' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'jw', name: 'Javanese', native: 'Basa Jawa' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'kk', name: 'Kazakh', native: 'Қazақша' },
    { code: 'km', name: 'Khmer', native: 'ភាសាខ្មែរ' },
    { code: 'rw', name: 'Kinyarwanda', native: 'Ikinyarwanda' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'ku', name: 'Kurdish', native: 'Kurdî' },
    { code: 'ky', name: 'Kyrgyz', native: 'Кыргызча' },
    { code: 'lo', name: 'Lao', native: 'ລາວ' },
    { code: 'la', name: 'Latin', native: 'Latina' },
    { code: 'lv', name: 'Latvian', native: 'Latviešu' },
    { code: 'lt', name: 'Lithuanian', native: 'Lietuvių' },
    { code: 'lb', name: 'Luxembourgish', native: 'Lëtzebuergesch' },
    { code: 'mk', name: 'Macedonian', native: 'Македонски' },
    { code: 'mg', name: 'Malagasy', native: 'Malagasy' },
    { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'mt', name: 'Maltese', native: 'Malti' },
    { code: 'mi', name: 'Maori', native: 'Te Reo Māori' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'mn', name: 'Mongolian', native: 'Монгол' },
    { code: 'my', name: 'Myanmar (Burmese)', native: 'မြန်မာ' },
    { code: 'ne', name: 'Nepali', native: 'नेपाली' },
    { code: 'no', name: 'Norwegian', native: 'Norsk' },
    { code: 'ny', name: 'Nyanja (Chichewa)', native: 'Chichewa' },
    { code: 'or', name: 'Odia (Oriya)', native: 'ଓଡ଼ିଆ' },
    { code: 'ps', name: 'Pashto', native: 'پښتو' },
    { code: 'fa', name: 'Persian', native: 'فارسی' },
    { code: 'pl', name: 'Polish', native: 'Polski' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'ro', name: 'Romanian', native: 'Română' },
    { code: 'ru', name: 'Russian', native: 'Русский' },
    { code: 'sm', name: 'Samoan', native: 'Gagana Samoa' },
    { code: 'gd', name: 'Scots Gaelic', native: 'Gàidhlig' },
    { code: 'sr', name: 'Serbian', native: 'Српски' },
    { code: 'st', name: 'Sesotho', native: 'Sesotho' },
    { code: 'sn', name: 'Shona', native: 'chiShona' },
    { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
    { code: 'si', name: 'Sinhala', native: 'සිංහල' },
    { code: 'sk', name: 'Slovak', native: 'Slovenčina' },
    { code: 'sl', name: 'Slovenian', native: 'Slovenščina' },
    { code: 'so', name: 'Somali', native: 'Soomaali' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'su', name: 'Sundanese', native: 'Basa Sunda' },
    { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
    { code: 'sv', name: 'Swedish', native: 'Svenska' },
    { code: 'tl', name: 'Tagalog (Filipino)', native: 'Filipino' },
    { code: 'tg', name: 'Tajik', native: 'Тоҷикӣ' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'tt', name: 'Tatar', native: 'Татар' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'th', name: 'Thai', native: 'ไทย' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe' },
    { code: 'tk', name: 'Turkmen', native: 'Türkmen' },
    { code: 'uk', name: 'Ukrainian', native: 'Українська' },
    { code: 'ur', name: 'Urdu', native: 'اردو' },
    { code: 'ug', name: 'Uyghur', native: 'ئۇيغۇرچە' },
    { code: 'uz', name: 'Uzbek', native: 'Oʻzbek' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
    { code: 'cy', name: 'Welsh', native: 'Cymraeg' },
    { code: 'xh', name: 'Xhosa', native: 'isiXhosa' },
    { code: 'yi', name: 'Yiddish', native: 'ייִדיש' },
    { code: 'yo', name: 'Yoruba', native: 'Yorùbá' },
    { code: 'zu', name: 'Zulu', native: 'isiZulu' },
];

const GoogleTranslateWidget = () => {
    const [currentLang, setCurrentLang] = useState('en');
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // --- INITIALIZATION ---

    useEffect(() => {
        // 1. Check if script is already present
        const scriptId = 'google-translate-script';
        let script = document.getElementById(scriptId);

        // 2. Define global callback
        if (!window.googleTranslateElementInit) {
            window.googleTranslateElementInit = () => {
                // Create the element if it doesn't exist
                if (!document.getElementById('google_translate_element')) {
                    const div = document.createElement('div');
                    div.id = 'google_translate_element';
                    // Hide it visually but keep it functional
                    div.style.position = 'absolute';
                    div.style.top = '-9999px';
                    div.style.left = '-9999px';
                    document.body.appendChild(div);
                }

                try {
                    new window.google.translate.TranslateElement({
                        pageLanguage: 'en',
                        // Simple layout generates the <select> we need
                        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                        autoDisplay: false
                    }, 'google_translate_element');
                } catch (e) {
                    console.error('[GoogleTranslate] Error initializing:', e);
                }
            };
        }

        // 3. Inject Styles to hide banner
        const styleId = 'google-translate-style-overrides';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
        body { top: 0px !important; }
        .goog-te-banner-frame { display: none !important; }
        .goog-te-gadget-icon { display: none !important; }
        .goog-tooltip { display: none !important; }
        .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; border: none !important; box-shadow: none !important; }
        font { background-color: transparent !important; box-shadow: none !important; }
      `;
            document.head.appendChild(style);
        }

        // 4. Load Script if needed
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        } else if (window.google?.translate) {
            // If already loaded, manually trigger init in case component remounted
            window.googleTranslateElementInit();
        }

        // 5. Check for existing cookie to set initial state
        const cookieMatch = document.cookie.match(/googtrans=\/(.+?)\/(.+?)/) || document.cookie.match(/googtrans=\/auto\/(.+?)/);
        if (cookieMatch && cookieMatch[1]) {
            // cookieMatch[2] is usually the code or 'auto'
            // Actually googtrans format is simply /from/to e.g /en/hi
            const cookieVal = document.cookie.split('; ').find(row => row.startsWith('googtrans='));
            if (cookieVal) {
                const parts = cookieVal.split('=')[1].split('/');
                const target = parts[parts.length - 1]; // get the last part
                if (target && target !== 'en') setCurrentLang(target);
            }
        }

    }, []);


    // --- HELPERS ---

    // Filter languages logic
    const filteredLanguages = useMemo(() => {
        if (!searchQuery.trim()) {
            const popular = POPULAR_LANGUAGES_ORDER
                .map(code => ALL_LANGUAGES.find(l => l.code === code))
                .filter(Boolean);

            const others = ALL_LANGUAGES.filter(
                l => !POPULAR_LANGUAGES_ORDER.includes(l.code)
            );
            return { popular, others };
        }

        const query = searchQuery.toLowerCase();
        const filtered = ALL_LANGUAGES.filter(
            l => l.name.toLowerCase().includes(query) ||
                l.native.toLowerCase().includes(query) ||
                l.code.toLowerCase().includes(query)
        );
        return { popular: [], others: filtered };
    }, [searchQuery]);

    const currentLanguageData = ALL_LANGUAGES.find(l => l.code === currentLang) || ALL_LANGUAGES.find(l => l.code === 'en');


    // --- ACTION HANDLERS ---

    const handleLanguageChange = (langCode) => {
        setIsLoading(true);

        // Case 1: Switching back to English (Original)
        if (langCode === 'en') {
            // We must clear cookies to revert to original text
            // Browsers are tricky with cookie domains, try multiple permutations
            const domain = window.location.hostname;
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain}`;
            document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

            setCurrentLang('en');
            // Force reload is the only reliable way to "turn off" Google Translate
            window.location.reload();
            return;
        }

        // Case 2: Switching to another language
        // We need to find the specific <select> that Google Translate injects

        // Retry loop to find the element
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max

        const tryChange = () => {
            const select = document.querySelector('.goog-te-combo');
            if (select) {
                select.value = langCode;
                select.dispatchEvent(new Event('change'));
                setCurrentLang(langCode);
                setIsLoading(false);
                setIsOpen(false);
                setSearchQuery('');
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(tryChange, 100);
                } else {
                    console.error('Could not find Google Translate selector');
                    setIsLoading(false);
                }
            }
        };

        tryChange();
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-focus search
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);


    // --- RENDER ---

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50"
            >
                {isLoading ? (
                    <Loader2 size={16} className="text-primary-600 animate-spin" />
                ) : (
                    <Globe size={16} className="text-primary-600" />
                )}
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                    {currentLanguageData?.native || 'English'}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 flex flex-col max-h-[80vh]"
                    >
                        {/* Search Header */}
                        <div className="p-3 border-b border-slate-100 bg-white sticky top-0 z-10">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search current languages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Language Lists */}
                        <div className="overflow-y-auto flex-1 p-2">

                            {/* Popular Section */}
                            {filteredLanguages.popular.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                                        Popular
                                    </div>
                                    {filteredLanguages.popular.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors group ${currentLang === lang.code
                                                    ? 'bg-primary-50 text-primary-700'
                                                    : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{lang.native}</span>
                                                <span className={`text-xs ${currentLang === lang.code ? 'text-primary-500' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                                    {lang.name}
                                                </span>
                                            </div>
                                            {currentLang === lang.code && (
                                                <Check size={16} className="text-primary-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Others Section */}
                            {filteredLanguages.others.length > 0 && (
                                <div>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-t border-slate-50 mt-2 pt-2">
                                        All Languages
                                    </div>
                                    {filteredLanguages.others.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors group ${currentLang === lang.code
                                                    ? 'bg-primary-50 text-primary-700'
                                                    : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{lang.native}</span>
                                                <span className={`text-xs ${currentLang === lang.code ? 'text-primary-500' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                                    {lang.name}
                                                </span>
                                            </div>
                                            {currentLang === lang.code && (
                                                <Check size={16} className="text-primary-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* No Results State */}
                            {filteredLanguages.popular.length === 0 && filteredLanguages.others.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                                    <Globe size={24} className="opacity-20" />
                                    <p>No languages found</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-slate-100 bg-slate-50">
                            <p className="text-[10px] text-center text-slate-400 font-medium tracking-wide">
                                POWERED BY GOOGLE TRANSLATE
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GoogleTranslateWidget;
