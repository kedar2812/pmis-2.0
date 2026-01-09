import { useEffect, useRef } from 'react';

/**
 * GoogleTranslateWidget - Simple & Stable Integration
 * 
 * This component:
 * 1. Loads Google Translate API
 * 2. Hides the Google Translate UI bar (but allows translation to work)
 * 3. No aggressive DOM manipulation - allows highlighting on hover
 * 
 * Crash prevention is handled by the ErrorBoundary in main.jsx
 */
const GoogleTranslateWidget = () => {
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        // ========================================
        // STEP 1: CSS TO HIDE GOOGLE TRANSLATE UI BAR
        // (Translation still works, just hides the banner)
        // ========================================

        const styleId = 'google-translate-hide-bar';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
        /* Hide the top translation bar */
        .goog-te-banner-frame,
        iframe.goog-te-banner-frame,
        .skiptranslate > iframe,
        body > .skiptranslate:first-child {
          display: none !important;
          height: 0 !important;
        }
        
        /* Prevent body from being pushed down */
        body {
          top: 0 !important;
        }
        
        html.translated-ltr body,
        html.translated-rtl body {
          top: 0 !important;
        }
        
        /* Hide the widget container but keep combo box functional */
        #google_translate_element {
          position: absolute !important;
          left: -9999px !important;
          visibility: hidden !important;
        }
        
        /* Hide Google branding & Cleanup UI */
        .goog-te-gadget,
        .goog-logo-link,
        .goog-te-gadget-icon,
        .goog-te-gadget-simple,
        .VIpgJd-ZVi9od-ORHb-OEVmcd {
          display: none !important;
        }

        /* Hide the 'Original text' popup - user only wants subtle highlighting */
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

        // ========================================
        // STEP 2: INITIALIZE GOOGLE TRANSLATE
        // ========================================

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

        // ========================================
        // STEP 3: SIMPLE BODY POSITION FIX
        // (Only fix the body offset issue, nothing else)
        // ========================================

        const bodyPositionFix = setInterval(() => {
            if (document.body.style.top && document.body.style.top !== '0px') {
                document.body.style.top = '0px';
            }
        }, 500);

        return () => {
            clearInterval(bodyPositionFix);
        };
    }, []);

    return (
        <div id="google_translate_element" style={{ display: 'none', height: 0, overflow: 'hidden' }}></div>
    );
};

export default GoogleTranslateWidget;
