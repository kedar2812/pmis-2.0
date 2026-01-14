import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import mastersService from '@/api/services/mastersService';

/**
 * Geography Selector Component
 * Provides dependent dropdowns: District → Town
 */
const GeographySelector = ({
    value = {},
    onChange,
    disabled = false,
    className = ''
}) => {
    const [districts, setDistricts] = useState([]);
    const [towns, setTowns] = useState([]);
    const [loading, setLoading] = useState({ districts: true, towns: false });

    useEffect(() => {
        fetchDistricts();
    }, []);

    const fetchDistricts = async () => {
        setLoading(prev => ({ ...prev, districts: true }));
        try {
            const res = await mastersService.getDistricts();
            setDistricts(res.data);
        } catch (error) {
            console.error('Failed to fetch districts:', error);
        } finally {
            setLoading(prev => ({ ...prev, districts: false }));
        }
    };

    const fetchTowns = useCallback(async (districtId) => {
        if (!districtId) {
            setTowns([]);
            return;
        }
        setLoading(prev => ({ ...prev, towns: true }));
        try {
            const res = await mastersService.getDistrictTowns(districtId);
            setTowns(res.data);
        } catch (error) {
            try {
                const allTowns = await mastersService.getTowns({ district: districtId });
                setTowns(allTowns.data);
            } catch {
                setTowns([]);
            }
        } finally {
            setLoading(prev => ({ ...prev, towns: false }));
        }
    }, []);

    const handleDistrictChange = (districtId) => {
        const district = districts.find(d => d.id === districtId);
        onChange({
            district: districtId,
            districtName: district?.name || '',
            town: '',
            townName: '',
        });
        setTowns([]);
        if (districtId) {
            fetchTowns(districtId);
        }
    };

    const handleTownChange = (townId) => {
        const town = towns.find(t => t.id === townId);
        onChange({
            ...value,
            town: townId,
            townName: town?.name || '',
        });
    };

    const selectClasses = `
    w-full px-3 py-2.5 rounded-lg border border-slate-200 
    bg-white text-slate-700 text-sm
    focus:border-primary-500 focus:ring-2 focus:ring-primary-100 
    outline-none transition-all appearance-none cursor-pointer
    disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400
  `;

    const renderSelect = (label, val, options, onChangeHandler, isLoading, placeholder, isDisabled = false, displayKey = 'name') => (
        <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
            <div className="relative">
                <select
                    value={val || ''}
                    onChange={(e) => onChangeHandler(e.target.value)}
                    disabled={isDisabled || isLoading}
                    className={selectClasses}
                >
                    <option value="">{placeholder}</option>
                    {options.map(opt => (
                        <option key={opt.id} value={opt.id}>
                            {opt.code ? `${opt.code} - ${opt[displayKey]}` : opt[displayKey]}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin text-slate-400" />
                    ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
            {renderSelect('District', value.district, districts, handleDistrictChange, loading.districts, 'Select District', disabled)}
            {renderSelect('Town/City', value.town, towns, handleTownChange, loading.towns, value.district ? 'Select Town' : 'Select District first', disabled || !value.district)}
        </div>
    );
};

export default GeographySelector;
