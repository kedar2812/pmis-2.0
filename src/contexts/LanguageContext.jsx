import { createContext, useContext } from 'react';

/**
 * LanguageContext - Simplified context for language state
 * 
 * Note: Translations are now handled entirely by Google Translate widget.
 * This context is kept only for backward compatibility with existing code.
 */
const LanguageContext = createContext(undefined);

export const LanguageProvider = ({ children }) => {
  // Provide a minimal implementation for backward compatibility
  // The actual translation is handled by Google Translate widget
  const t = (key) => key; // Just return the key - Google Translate handles translation

  return (
    <LanguageContext.Provider value={{ language: 'en', setLanguage: () => { }, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  // Check if context is undefined (used outside provider)
  if (context === undefined) {
    // Return a dummy context to prevent crash
    return {
      t: (key) => key,
      language: 'en',
      setLanguage: () => { }
    };
  }
  return context;
};
