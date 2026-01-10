import React, { useState, useEffect, useCallback } from 'react';
import mastersService from '../../api/services/mastersService';
import { MapPin, Building2, Globe, Navigation, Loader2 } from 'lucide-react';

/**
 * LocationSelector - Cascading dropdown for Country → State → District → City
 * Professional styling matching project theme
 * 
 * Props:
 * - value: { country: id, state: id, district: id, city: id }
 * - onChange: (value) => void
 * - disabled: boolean
 * - required: boolean
 * - className: string
 */
const LocationSelector = ({
    value = {},
    onChange,
    disabled = false,
    required = false,
    className = ''
}) => {
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [cities, setCities] = useState([]);

    const [loading, setLoading] = useState({
        countries: true,
        states: false,
        districts: false,
        cities: false
    });

    // Fetch countries on mount
    useEffect(() => {
        fetchCountries();
    }, []);

    // Fetch states when country changes
    useEffect(() => {
        if (value.country) {
            fetchStates(value.country);
        } else {
            setStates([]);
            setDistricts([]);
            setCities([]);
        }
    }, [value.country]);

    // Fetch districts when state changes
    useEffect(() => {
        if (value.state) {
            fetchDistricts(value.state);
        } else {
            setDistricts([]);
            setCities([]);
        }
    }, [value.state]);

    // Fetch cities when district changes
    useEffect(() => {
        if (value.district) {
            fetchCities(value.district);
        } else {
            setCities([]);
        }
    }, [value.district]);

    const fetchCountries = async () => {
        setLoading(prev => ({ ...prev, countries: true }));
        try {
            const res = await mastersService.getCountries();
            setCountries(res.data || []);

            // Auto-select India if it's the only country (UX improvement)
            if (res.data?.length === 1 && !value.country) {
                // We can't call handleCountryChange directly as it expects an event
                // So we trigger onChange directly
                onChange({
                    country: res.data[0].id,
                    state: '',
                    district: '',
                    city: ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch countries:', error);
        } finally {
            setLoading(prev => ({ ...prev, countries: false }));
        }
    };

    const fetchStates = useCallback(async (countryId) => {
        if (!countryId) return;
        setLoading(prev => ({ ...prev, states: true }));
        try {
            const res = await mastersService.getStates({ country: countryId });
            setStates(res.data || []);
        } catch (error) {
            console.error('Failed to fetch states:', error);
            setStates([]);
        } finally {
            setLoading(prev => ({ ...prev, states: false }));
        }
    }, []);

    const fetchDistricts = useCallback(async (stateId) => {
        if (!stateId) return;
        setLoading(prev => ({ ...prev, districts: true }));
        try {
            const res = await mastersService.getStateDistricts(stateId);
            setDistricts(res.data || []);
        } catch (error) {
            console.error('Failed to fetch districts:', error);
            setDistricts([]);
        } finally {
            setLoading(prev => ({ ...prev, districts: false }));
        }
    }, []);

    const fetchCities = useCallback(async (districtId) => {
        if (!districtId) return;
        setLoading(prev => ({ ...prev, cities: true }));
        try {
            const res = await mastersService.getDistrictCities(districtId);
            setCities(res.data || []);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
            setCities([]);
        } finally {
            setLoading(prev => ({ ...prev, cities: false }));
        }
    }, []);

    const handleChange = (field, newVal) => {
        const nextValue = { ...value, [field]: newVal };

        // Reset dependent fields
        if (field === 'country') {
            nextValue.state = '';
            nextValue.district = '';
            nextValue.city = '';
        } else if (field === 'state') {
            nextValue.district = '';
            nextValue.city = '';
        } else if (field === 'district') {
            nextValue.city = '';
        }

        onChange(nextValue);
    };

    const SelectField = ({ label, field, options, icon: Icon, isLoading, placeholder, disabled: fieldDisabled }) => (
        <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Icon size={14} className="text-slate-400" />
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <select
                    value={value[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    disabled={disabled || fieldDisabled || isLoading}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none disabled:bg-slate-50 disabled:cursor-not-allowed appearance-none truncate"
                >
                    <option value="">{placeholder}</option>
                    {options.map(opt => (
                        <option key={opt.id} value={opt.id}>
                            {opt.name}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin text-primary-500" />
                    ) : (
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
            <SelectField
                label="Country"
                field="country"
                options={countries}
                icon={Globe}
                isLoading={loading.countries}
                placeholder="Select Country"
            />

            <SelectField
                label="State"
                field="state"
                options={states}
                icon={MapPin}
                isLoading={loading.states}
                placeholder="Select State"
                disabled={!value.country}
            />

            <SelectField
                label="District"
                field="district"
                options={districts}
                icon={Navigation}
                isLoading={loading.districts}
                placeholder="Select District"
                disabled={!value.state}
            />

            <SelectField
                label="City/Area"
                field="city"
                options={cities}
                icon={Building2}
                isLoading={loading.cities}
                placeholder="Select City"
                disabled={!value.district}
            />
        </div>
    );
};

export default LocationSelector;
