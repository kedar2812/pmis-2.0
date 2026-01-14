import { useEffect, useRef, useState } from 'react';

/**
 * GoogleTranslateWidget - Conditional Loading
 * 
 * IMPORTANT: Only loads Google Translate when a non-English language is selected.
 * When in English mode, this component renders nothing and loads no scripts.
 * This prevents CORS errors and unwanted translation interference.
 */
const GoogleTranslateWidget = () => {
    const initializedRef = useRef(false);
    const [shouldLoad, setShouldLoad] = useState(false);

    // Check if we need to load Google Translate
    useEffect(() => {
        const savedLang = localStorage.getItem('pmis_language');
        const needsTranslation = savedLang && savedLang !== 'en';
        setShouldLoad(needsTranslation);

        // If English, aggressively clean up any existing Google Translate artifacts
        if (!needsTranslation) {
            cleanupGoogleTranslate();
        }
    }, []);

    // Listen for language changes (same tab via custom event, cross-tab via storage)
    useEffect(() => {
        const handleLanguageChange = (event) => {
            // Get language from custom event detail or from localStorage
            const newLang = event.detail?.language || localStorage.getItem('pmis_language');
            const needsTranslation = newLang && newLang !== 'en';

            if (needsTranslation && !shouldLoad) {
                // Switching TO a non-English language - need to load script
                initializedRef.current = false; // Reset so script loads
            }

            setShouldLoad(needsTranslation);

            if (!needsTranslation) {
                cleanupGoogleTranslate();
            }
        };

        // Custom event for same-tab changes (from LanguageContext)
        window.addEventListener('pmis-language-change', handleLanguageChange);
        // Storage event for cross-tab changes
        window.addEventListener('storage', handleLanguageChange);

        return () => {
            window.removeEventListener('pmis-language-change', handleLanguageChange);
            window.removeEventListener('storage', handleLanguageChange);
        };
    }, [shouldLoad]);

    // Cleanup function to remove all Google Translate artifacts
    const cleanupGoogleTranslate = () => {
        // Clear cookies
        const domain = window.location.hostname;
        const pastDate = 'Thu, 01 Jan 1970 00:00:00 UTC';
        document.cookie = `googtrans=; expires=${pastDate}; path=/;`;
        document.cookie = `googtrans=; expires=${pastDate}; path=/; domain=${domain}`;
        document.cookie = `googtrans=; expires=${pastDate}; path=/; domain=.${domain}`;

        // Clear subdomains
        const parts = domain.split('.');
        while (parts.length > 1) {
            const d = parts.join('.');
            document.cookie = `googtrans=; expires=${pastDate}; path=/; domain=.${d}`;
            parts.shift();
        }

        // Reset body position if it was modified
        if (document.body.style.top) {
            document.body.style.top = '0px';
        }

        // Remove translated class from html
        document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
    };

    // Only load Google Translate when needed
    useEffect(() => {
        if (!shouldLoad || initializedRef.current) return;
        initializedRef.current = true;

        // Add CSS to hide Google Translate UI bar
        const styleId = 'google-translate-hide-bar';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .goog-te-banner-frame,
                iframe.goog-te-banner-frame,
                .skiptranslate > iframe,
                body > .skiptranslate:first-child {
                    display: none !important;
                    height: 0 !important;
                }
                body { top: 0 !important; }
                html.translated-ltr body,
                html.translated-rtl body { top: 0 !important; }
                #google_translate_element {
                    position: absolute !important;
                    left: -9999px !important;
                    visibility: hidden !important;
                }
                .goog-te-gadget,
                .goog-logo-link,
                .goog-te-gadget-icon,
                .goog-te-gadget-simple,
                .VIpgJd-ZVi9od-ORHb-OEVmcd { display: none !important; }
                .goog-tooltip,
                .goog-tooltip:hover,
                .goog-te-balloon-frame,
                #goog-gt-tt {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Initialize Google Translate
        window.googleTranslateElementInit = () => {
            try {
                if (document.getElementById('google_translate_element') && window.google?.translate) {
                    new window.google.translate.TranslateElement(
                        {
                            pageLanguage: 'en',
                            autoDisplay: false,
                            multilanguagePage: true,
                        },
                        'google_translate_element'
                    );

                    // Trigger translation to saved language
                    const savedLang = localStorage.getItem('pmis_language');
                    if (savedLang && savedLang !== 'en') {
                        setTimeout(() => {
                            const googleSelect = document.querySelector('.goog-te-combo');
                            if (googleSelect) {
                                googleSelect.value = savedLang;
                                googleSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, 500);
                    }
                }
            } catch (err) {
                console.error("Google Translate Init Error:", err);
            }
        };

        // Load Google Translate script
        if (!document.getElementById('google-translate-script')) {
            const script = document.createElement('script');
            script.id = 'google-translate-script';
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        } else if (window.google?.translate) {
            window.googleTranslateElementInit();
        }

        // Fix body position continuously
        const bodyPositionFix = setInterval(() => {
            if (document.body.style.top && document.body.style.top !== '0px') {
                document.body.style.top = '0px';
            }
        }, 500);

        return () => clearInterval(bodyPositionFix);
    }, [shouldLoad]);

    // Don't render anything if English is selected
    if (!shouldLoad) {
        return null;
    }

    return (
        <div id="google_translate_element" style={{ display: 'none', height: 0, overflow: 'hidden' }}></div>
    );
};

export default GoogleTranslateWidget;

