/**
 * Translation Service for dynamic user input translation
 * Uses MyMemory Translation API (free, no API key required for basic usage)
 * Falls back to mock dictionary for common PMIS terms
 */

// Mock dictionary for common PMIS terminology
const mockDictionary = {
  en: {
    'project': 'project',
    'infrastructure': 'infrastructure',
    'management': 'management',
    'construction': 'construction',
    'development': 'development',
    'planning': 'planning',
    'budget': 'budget',
    'schedule': 'schedule',
    'risk': 'risk',
    'document': 'document',
    'approval': 'approval',
    'contractor': 'contractor',
    'consultant': 'consultant',
    'government': 'government',
    'department': 'department',
  },
  hi: {
    'project': 'परियोजना',
    'infrastructure': 'बुनियादी ढांचा',
    'management': 'प्रबंधन',
    'construction': 'निर्माण',
    'development': 'विकास',
    'planning': 'योजना',
    'budget': 'बजट',
    'schedule': 'अनुसूची',
    'risk': 'जोखिम',
    'document': 'दस्तावेज़',
    'approval': 'अनुमोदन',
    'contractor': 'ठेकेदार',
    'consultant': 'सलाहकार',
    'government': 'सरकार',
    'department': 'विभाग',
  },
  te: {
    'project': 'ప్రాజెక్ట్',
    'infrastructure': 'మౌలిక సదుపాయాలు',
    'management': 'నిర్వహణ',
    'construction': 'నిర్మాణం',
    'development': 'అభివృద్ధి',
    'planning': 'ప్రణాళిక',
    'budget': 'బడ్జెట్',
    'schedule': 'షెడ్యూల్',
    'risk': 'రిస్క్',
    'document': 'పత్రం',
    'approval': 'అనుమోదన',
    'contractor': 'కాంట్రాక్టర్',
    'consultant': 'కన్సల్టెంట్',
    'government': 'ప్రభుత్వం',
    'department': 'శాఖ',
  },
};

/**
 * Translate text using MyMemory API (free, no API key required)
 * Falls back to mock dictionary if API fails
 */
export async function translateText(text, targetLang, sourceLang = 'en') {
  if (!text.trim()) {
    return {
      translatedText: '',
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    };
  }

  // If same language, return original
  if (sourceLang === targetLang) {
    return {
      translatedText: text,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    };
  }

  // Try MyMemory API first (free, no API key needed for basic usage)
  try {
    const langPair = `${sourceLang}|${targetLang}`;
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return {
          translatedText: data.responseData.translatedText,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        };
      }
    }
  } catch (error) {
    console.warn('MyMemory API failed, falling back to mock dictionary:', error);
  }

  // Fallback to mock dictionary for common terms
  const translatedText = translateWithDictionary(text, sourceLang, targetLang);
  return {
    translatedText,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
  };
}

/**
 * Simple dictionary-based translation for common PMIS terms
 */
function translateWithDictionary(text, sourceLang, targetLang) {
  const sourceDict = mockDictionary[sourceLang] || {};
  const targetDict = mockDictionary[targetLang] || {};

  // Simple word-by-word replacement for dictionary terms
  let translated = text;
  const words = text.toLowerCase().split(/\s+/);

  words.forEach((word) => {
    // Remove punctuation for matching
    const cleanWord = word.replace(/[.,!?;:]/g, '');
    
    // Find the key in source dictionary
    const sourceKey = Object.keys(sourceDict).find(
      (key) => sourceDict[key].toLowerCase() === cleanWord
    );

    if (sourceKey && targetDict[sourceKey]) {
      // Replace the word (case-insensitive)
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      translated = translated.replace(regex, targetDict[sourceKey]);
    }
  });

  // If no translation found, return original with a note
  if (translated === text && text.length > 0) {
    return `${text} [Translation: Use professional translation service for accurate results]`;
  }

  return translated;
}

