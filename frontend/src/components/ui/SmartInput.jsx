import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * SmartInput - Text input with optional translation button
 * 
 * Translation is now handled by Google Translate for the entire page.
 * This component provides a simple text input/textarea with label support.
 */
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
  const InputComponent = rows > 1 ? 'textarea' : 'input';
  const inputProps = rows > 1 ? { rows } : { type: 'text' };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-app-heading mb-1">
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
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 bg-app-card text-app-heading disabled:bg-app-hover disabled:text-app-muted ${error ? 'border-red-500' : 'border-app'
            } ${className}`}
        />
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
