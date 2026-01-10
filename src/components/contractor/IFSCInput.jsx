/**
 * IFSC Input Component
 * Validates IFSC code and auto-fills bank branch details
 * Uses self-hosted IFSC database - NO external APIs
 * 
 * Features:
 * - Only shows errors AFTER user has interacted (touched) the field
 * - Validates format and looks up in database on blur
 * - Auto-fills bank and branch name on successful lookup
 */
import { useState, useEffect } from 'react';
import { fetchIFSCDetails, isValidIFSCFormat } from '@/services/ifscService';
import { Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

const IFSCInput = ({
    value,
    onChange,
    onBranchDataFetched,
    disabled = false,
    error = '',
}) => {
    const [loading, setLoading] = useState(false);
    const [validated, setValidated] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [touched, setTouched] = useState(false); // Track if user has interacted

    // Reset states when value is cleared externally
    useEffect(() => {
        if (!value) {
            setValidated(false);
            setValidationError('');
            setTouched(false);
        }
    }, [value]);

    const validateIFSC = async () => {
        setTouched(true); // Mark as touched on blur

        // Skip validation if empty (let form-level validation handle required)
        if (!value) {
            setValidated(false);
            setValidationError('');
            return;
        }

        // Skip if not complete (11 chars)
        if (value.length !== 11) {
            setValidationError('IFSC code must be 11 characters');
            setValidated(false);
            return;
        }

        // Check format first
        if (!isValidIFSCFormat(value)) {
            setValidationError('Invalid IFSC format (e.g., SBIN0001234)');
            setValidated(false);
            return;
        }

        setLoading(true);
        setValidationError('');

        try {
            const branchData = await fetchIFSCDetails(value);
            setValidated(true);
            setValidationError('');

            // Call parent callback with branch data
            if (onBranchDataFetched) {
                onBranchDataFetched(branchData);
            }

            toast.success(`IFSC verified: ${branchData.bank_name} - ${branchData.branch_name}`);
        } catch (err) {
            setValidationError(err.message);
            setValidated(false);
            // Only show toast for actual lookup failures, not format issues
            if (err.message.includes('not found')) {
                toast.error('IFSC code not found in database');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const newValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        onChange(newValue);
        setValidated(false);
        // Clear validation error when user starts typing again
        if (validationError) {
            setValidationError('');
        }
    };

    // Only show error if field has been touched OR there's a form-level error
    const displayError = touched ? (validationError || error) : '';

    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                IFSC Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onBlur={validateIFSC}
                    maxLength={11}
                    placeholder="SBIN0001234"
                    disabled={disabled}
                    className={`w-full px-4 py-2.5 pr-10 rounded-xl border transition-all outline-none focus:ring-2 ${displayError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : validated
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                            : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
                        } ${disabled ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {loading && (
                        <Loader2 size={18} className="animate-spin text-primary-600" />
                    )}
                    {validated && !loading && (
                        <CheckCircle size={18} className="text-green-600" />
                    )}
                    {displayError && !loading && (
                        <AlertCircle size={18} className="text-red-500" />
                    )}
                    {!loading && !validated && !displayError && value && (
                        <Search size={18} className="text-slate-400" />
                    )}
                </div>
            </div>
            {displayError && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} /> {displayError}
                </p>
            )}
            {!displayError && !validated && (
                <p className="mt-1 text-xs text-slate-500">
                    Enter 11-character IFSC code (e.g., SBIN0001234)
                </p>
            )}
            {validated && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} /> IFSC verified - branch details auto-filled
                </p>
            )}
        </div>
    );
};

export default IFSCInput;
