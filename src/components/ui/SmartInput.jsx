import { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * SmartInput - Simple input with optional translation hint
 * Note: Translation is now handled by Google Translate widget globally
 */
export const SmartInput = ({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 3,
  disabled = false,
  label,
  required = false,
  error,
}) => {
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
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-600 focus:border-primary-600 ${error ? 'border-red-500' : 'border-gray-300'
            } ${className}`}
        />
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default SmartInput;
