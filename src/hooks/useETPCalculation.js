import { useState, useCallback, useEffect } from 'react';
import financeService from '@/api/services/financeService';
import { debounce } from '@/lib/utils';

/**
 * React hook for automatic ETP calculation
 * 
 * Fetches deductions from the backend based on current bill values
 * and provides a complete bill summary.
 * 
 * @example
 * const { calculate, summary, loading, error } = useETPCalculation();
 * 
 * // Call when gross amount changes
 * useEffect(() => {
 *   calculate({ gross_amount: 1000000 });
 * }, [grossAmount]);
 */
export const useETPCalculation = (options = {}) => {
    const { autoCalculate = false, debounceMs = 500 } = options;

    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Perform ETP calculation
     * @param {Object} params - Calculation parameters
     */
    const calculate = useCallback(async (params) => {
        if (!params.gross_amount || params.gross_amount <= 0) {
            setSummary(null);
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await financeService.calculateETP({
                gross_amount: params.gross_amount,
                gst_percentage: params.gst_percentage ?? 18,
                retention_percentage: params.retention_percentage ?? 0,
                other_deductions: params.other_deductions ?? 0,
                advances_recovery: params.advances_recovery ?? 0,
                works_component: params.works_component,
                material_cost: params.material_cost,
                labour_cost: params.labour_cost,
            });

            setSummary(response.data);
            return response.data;
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Calculation failed';
            setError(errorMsg);
            console.error('ETP calculation error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced version for auto-calculation
    const debouncedCalculate = useCallback(
        debounce(calculate, debounceMs),
        [calculate, debounceMs]
    );

    return {
        calculate,
        debouncedCalculate,
        summary,
        loading,
        error,
        // Helper getters from summary
        get netPayable() { return summary?.net_payable ?? 0; },
        get totalDeductions() { return summary?.total_deductions ?? 0; },
        get gstAmount() { return summary?.gst_amount ?? 0; },
        get statutoryCharges() { return summary?.statutory_charges ?? { deductions: [], recoveries: [], levies: [], additions: [] }; },
    };
};

/**
 * Format currency in Indian Rupees
 */
export const formatINR = (amount, showPaise = true) => {
    if (amount === null || amount === undefined) return '₹0';

    const num = Number(amount);
    if (isNaN(num)) return '₹0';

    const options = {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: showPaise ? 2 : 0,
        maximumFractionDigits: showPaise ? 2 : 0,
    };

    return num.toLocaleString('en-IN', options);
};

/**
 * Calculate percentage of total
 */
export const calculatePercentage = (part, total) => {
    if (!total || total === 0) return 0;
    return ((part / total) * 100).toFixed(2);
};

export default useETPCalculation;
