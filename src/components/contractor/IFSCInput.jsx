/**
 * IFSC Input Component
 * Validates IFSC code and auto-fills bank branch details
 * Uses self-hosted IFSC database - NO external APIs
 */
import { useState } from 'react';
import { fetchIFSCDetails, isValidIFSCFormat } from '@/services/ifscService';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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

    const validateIFSC = async () => {
        // Skip if empty or wrong length
        if (!value || value.length !== 11) return;

        // Check format first
        if (!isValidIFSCFormat(value)) {
            setValidationError('Invalid IFSC format');
            setValidated(false);
            return;
        }

        setLoading(true);
        setValidationError('');

        try {
            const branchData = await fetchIFSCDetails(value);
            setValidated(true);

            // Call parent callback with branch data
            if (onBranchDataFetched) {
                onBranchDataFetched(branchData);
            }

            toast.success(`IFSC verified: ${branchData.bank_name} - ${branchData.branch_name}`);
        } catch (err) {
            setValidationError(err.message);
            setValidated(false);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const newValue = e.target.value.toUpperCase();
        onChange(newValue);
        setValidated(false);
        setValidationError('');
    };

    const displayError = error || validationError;

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
                        <AlertCircle size={18} className="text-red-600" />
                    )}
                </div>
            </div>
            {displayError && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={14} /> {displayError}
                </p>
            )}
            {!displayError && (
                <p className="mt-1 text-xs text-slate-500">
                    Format: ABCD0123456 (4 letters, 0, 6 alphanumeric)
                </p>
            )}
        </div>
    );
};

export default IFSCInput;
