import { useEffect, useRef } from 'react';

const GoogleTranslateWidget = () => {
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        // 1. Define the callback globally
        window.googleTranslateElementInit = () => {
            try {
                // Check if element exists before init to be safe
                if (document.getElementById('google_translate_element')) {
                    new window.google.translate.TranslateElement(
                        {
                            pageLanguage: 'en',
                            autoDisplay: false
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
            // If script is already there and loaded (soft nav), manually init
            window.googleTranslateElementInit();
        }

        // 3. Inject Styles
        const style = document.createElement('style');
        style.innerHTML = `
        body { top: 0px !important; }
        .goog-te-banner-frame.skiptranslate { display: none !important; } 
        iframe.goog-te-banner-frame { display: none !important; }
        .goog-te-gadget-icon { display: none !important; }
        #google_translate_element { display: none; } 
        .goog-tooltip { display: none !important; }
        .goog-te-gadget-simple { display: none !important; }
        .goog-logo-link { display: none !important; }
        .goog-te-gadget { color: transparent !important; }
        
        /* Specific fix for the top bar space */
        body { position: static !important; top: 0px !important; }
    `;
        document.head.appendChild(style);

        return () => {
            // Cleanup? Usually script stays. Styles can stay.
            // document.head.removeChild(style);
        };
    }, []);

    return (
        <div id="google_translate_element" style={{ display: 'none' }}></div>
    );
};

export default GoogleTranslateWidget;
