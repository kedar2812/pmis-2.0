import { useEffect, useRef } from 'react';

/**
 * GoogleTranslateWidget - Invisible Google Translate integration
 * 
 * This component:
 * 1. Loads Google Translate API
 * 2. Hides ALL Google Translate UI elements (bar, branding, etc.)
 * 3. Provides translation functionality via the hidden combo box
 */
const GoogleTranslateWidget = () => {
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        // 1. Define the callback globally
        window.googleTranslateElementInit = () => {
            try {
                if (document.getElementById('google_translate_element')) {
                    new window.google.translate.TranslateElement(
                        {
                            pageLanguage: 'en',
                            autoDisplay: false,
                            // Don't show popup
                            multilanguagePage: true,
                        },
                        'google_translate_element'
                    );
                }
            } catch (err) {
                console.error("Google Translate Init Error:", err);
            }
        };

        // 2. Inject script if not present
        if (!document.getElementById('google-translate-script')) {
            const script = document.createElement('script');
            script.id = 'google-translate-script';
            script.type = 'text/javascript';
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            document.body.appendChild(script);
        } else if (window.google && window.google.translate) {
            window.googleTranslateElementInit();
        }

        // 3. Inject comprehensive styles to hide ALL Google Translate UI
        const styleId = 'google-translate-hide-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
        /* ========================================
           HIDE ALL GOOGLE TRANSLATE UI ELEMENTS
           ======================================== */
        
        /* Hide the top translation bar completely */
        .goog-te-banner-frame,
        .goog-te-banner-frame.skiptranslate,
        iframe.goog-te-banner-frame,
        body > .skiptranslate,
        .skiptranslate > iframe,
        #goog-gt-tt,
        .goog-te-balloon-frame,
        div#goog-gt-,
        .goog-text-highlight {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        
        /* Remove the top body offset that Google Translate adds */
        body {
          top: 0 !important;
          position: static !important;
        }
        
        /* Hide the widget container */
        #google_translate_element {
          display: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        
        /* Hide all Google Translate gadgets */
        .goog-te-gadget,
        .goog-te-gadget-icon,
        .goog-te-gadget-simple,
        .goog-logo-link,
        .goog-te-menu-value,
        .goog-te-menu2-item-selected,
        .goog-tooltip,
        .goog-tooltip:hover {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Keep the combo box accessible but hidden */
        .goog-te-combo {
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        
        /* Remove any Google Translate highlights on translated text */
        .goog-text-highlight {
          background-color: transparent !important;
          box-shadow: none !important;
        }
        
        /* Fix for the body being pushed down */
        html.translated-ltr body,
        html.translated-rtl body {
          top: 0 !important;
        }
        
        /* Remove the "Translated by Google" footer/tooltip */
        .goog-te-ftab-frame {
          display: none !important;
        }
        
        /* Hide VT button that appears on hover */
        .VIpgJd-ZVi9od-l4eHX-hSRGPd,
        .VIpgJd-ZVi9od-ORHb-OEVmcd {
          display: none !important;
        }
      `;
            document.head.appendChild(style);
        }

        // 4. Add MutationObserver to continuously hide elements that get re-added
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Hide any iframe that's a Google Translate banner
                        if (node.classList?.contains('goog-te-banner-frame') ||
                            node.classList?.contains('skiptranslate') ||
                            (node.tagName === 'IFRAME' && node.className?.includes('goog-te'))) {
                            node.style.display = 'none';
                            node.style.visibility = 'hidden';
                            node.style.height = '0';
                        }
                        // Also check body's top position and reset it
                        if (document.body.style.top !== '0px') {
                            document.body.style.top = '0px';
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // 5. Periodically check and reset body position (backup)
        const intervalId = setInterval(() => {
            if (document.body.style.top && document.body.style.top !== '0px') {
                document.body.style.top = '0px';
            }
            // Also hide any visible banner frames
            document.querySelectorAll('.goog-te-banner-frame, .skiptranslate > iframe').forEach(el => {
                el.style.display = 'none';
            });
        }, 500);

        return () => {
            observer.disconnect();
            clearInterval(intervalId);
        };
    }, []);

    return (
        <div id="google_translate_element" style={{ display: 'none', height: 0, overflow: 'hidden' }}></div>
    );
};

export default GoogleTranslateWidget;
