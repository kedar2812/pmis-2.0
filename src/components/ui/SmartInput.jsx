import { useState } from 'react';
import i18n from '@/i18n';
import { Languages, Loader2 } from 'lucide-react';
import { translateText } from '@/lib/translationService';
import { toast } from 'sonner';

export const SmartInput = ({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 3,
  disabled = false,
  targetLang,
  label,
  required = false,
  error,
}) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const currentLang = (i18n.language) || 'en';
  const translationTarget = targetLang || (currentLang === 'en' ? 'hi' : currentLang);
  
  const t = (key) => {
    return i18n.t(key) || key;
  };

  const handleTranslate = async () => {
    if (!value.trim()) {
      toast.info(t('translation.enterTextToTranslate'));
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translateText(value, translationTarget, currentLang);
      onChange(result.translatedText);
      toast.success(t('translation.translate'), {
        description: `Translated to ${translationTarget.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(t('translation.translationFailed'));
    } finally {
      setIsTranslating(false);
    }
  };

  const InputComponent = rows > 1 ? 'textarea' : 'input';
  const inputProps = rows > 1 ? { rows } : { type: 'text' };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <InputComponent
          {...inputProps}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isTranslating}
          className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
        />
        {value.trim() && (
          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating || disabled}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('translation.translate')}
            aria-label={t('translation.translate')}
          >
            {isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
            ) : (
              <Languages className="h-4 w-4 text-primary-600" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      {value.trim() && !isTranslating && (
        <p className="text-xs text-gray-500 mt-1">
          {t('translation.translate')} to {translationTarget.toUpperCase()}
        </p>
      )}
    </div>
  );
};





