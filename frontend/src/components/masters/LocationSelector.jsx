import React, { useState, useEffect, useCallback } from 'react';
import mastersService from '../../api/services/mastersService';
import { MapPin, Building2, Globe, Navigation, Loader2, ChevronDown, Check } from 'lucide-react';

/**
 * LocationSelector - Cascading dropdown for Country → State → District → City
 * Premium dark theme styling with glassmorphism design
 * 
 * Props:
 * - value: { country: id, state: id, district: id, city: id }
 * - onChange: (value) => void
 * - disabled: boolean
 * - required: boolean
 * - className: string
 */
const LocationSelector = ({
    value,
    onChange,
    disabled = false,
    required = false,
    className = ''
}) => {
    // Normalize value to empty object if null/undefined
    const normalizedValue = value || {};

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

    const [openDropdown, setOpenDropdown] = useState(null);

    // Fetch countries on mount
    useEffect(() => {
        fetchCountries();
    }, []);

    // Fetch states when country changes
    useEffect(() => {
        if (normalizedValue.country) {
            fetchStates(normalizedValue.country);
        } else {
            setStates([]);
            setDistricts([]);
            setCities([]);
        }
    }, [normalizedValue.country]);

    // Fetch districts when state changes
    useEffect(() => {
        if (normalizedValue.state) {
            fetchDistricts(normalizedValue.state);
        } else {
            setDistricts([]);
            setCities([]);
        }
    }, [normalizedValue.state]);

    // Fetch cities when district changes
    useEffect(() => {
        if (normalizedValue.district) {
            fetchCities(normalizedValue.district);
        } else {
            setCities([]);
        }
    }, [normalizedValue.district]);

    const fetchCountries = async () => {
        setLoading(prev => ({ ...prev, countries: true }));
        try {
            console.log('[LocationSelector] Fetching countries...');
            const res = await mastersService.getCountries();
            console.log('[LocationSelector] Countries response:', res);

            // Handle various response formats
            let data = [];
            if (Array.isArray(res.data)) {
                data = res.data;
            } else if (res.data?.results && Array.isArray(res.data.results)) {
                data = res.data.results;
            } else if (res.data && typeof res.data === 'object') {
                // Check if it's iterable
                data = Object.values(res.data).filter(item => item && typeof item === 'object' && item.id);
            }

            console.log('[LocationSelector] Parsed countries data:', data);
            setCountries(data);

            // Auto-select India if it's the only country (UX improvement)
            if (data.length === 1 && !normalizedValue.country) {
                console.log('[LocationSelector] Auto-selecting India');
                onChange({
                    country: data[0].id,
                    countryName: data[0].name,
                    state: '',
                    stateName: '',
                    district: '',
                    districtName: '',
                    city: '',
                    cityName: ''
                });
            }
        } catch (error) {
            console.error('[LocationSelector] Failed to fetch countries:', error);
            console.error('[LocationSelector] Error details:', error.response?.data || error.message);
            setCountries([]);
        } finally {
            setLoading(prev => ({ ...prev, countries: false }));
        }
    };

    const fetchStates = useCallback(async (countryId) => {
        if (!countryId) return;
        setLoading(prev => ({ ...prev, states: true }));
        try {
            const res = await mastersService.getStates({ country: countryId });
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setStates(data);
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
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setDistricts(data);
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
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            setCities(data);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
            setCities([]);
        } finally {
            setLoading(prev => ({ ...prev, cities: false }));
        }
    }, []);

    const handleSelect = (field, id, name, options) => {
        const nextValue = { ...normalizedValue, [field]: id };
        const nameField = `${field}Name`;
        nextValue[nameField] = name;

        // Reset dependent fields
        if (field === 'country') {
            nextValue.state = '';
            nextValue.stateName = '';
            nextValue.district = '';
            nextValue.districtName = '';
            nextValue.city = '';
            nextValue.cityName = '';
        } else if (field === 'state') {
            nextValue.district = '';
            nextValue.districtName = '';
            nextValue.city = '';
            nextValue.cityName = '';
        } else if (field === 'district') {
            nextValue.city = '';
            nextValue.cityName = '';
        }

        onChange(nextValue);
        setOpenDropdown(null);
    };

    const getSelectedName = (field, options) => {
        const id = normalizedValue[field];
        if (!id) return null;
        const option = options.find(opt => String(opt.id) === String(id));
        return option?.name || null;
    };

    // Custom Select Component
    const SelectField = ({ label, field, options, icon: Icon, isLoading, placeholder, fieldDisabled }) => {
        const isOpen = openDropdown === field;
        const selectedName = getSelectedName(field, options);
        const isDisabled = disabled || fieldDisabled || isLoading;

        return (
            <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-app-muted mb-2 flex items-center gap-1.5">
                    <Icon size={14} className="text-primary-500" />
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !isDisabled && setOpenDropdown(isOpen ? null : field)}
                        disabled={isDisabled}
                        className={`
                            w-full px-4 py-3 rounded-xl text-left transition-all duration-200
                            flex items-center justify-between gap-2
                            bg-app-input border border-app
                            ${isDisabled
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-primary-500/50 hover:bg-app-hover cursor-pointer'
                            }
                            ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : ''}
                            ${selectedName ? 'text-app-heading' : 'text-app-muted'}
                        `}
                    >
                        <span className="truncate">
                            {isLoading ? 'Loading...' : (selectedName || placeholder)}
                        </span>
                        <span className="flex-shrink-0">
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin text-primary-500" />
                            ) : (
                                <ChevronDown
                                    size={16}
                                    className={`text-app-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                />
                            )}
                        </span>
                    </button>

                    {/* Dropdown Menu - Opens UPWARD */}
                    {isOpen && options.length > 0 && (
                        <div className="absolute z-50 w-full bottom-full mb-2 py-2 rounded-xl border border-app bg-app-card shadow-xl max-h-60 overflow-y-auto">
                            {options.map(opt => {
                                const isSelected = String(normalizedValue[field]) === String(opt.id);
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => handleSelect(field, opt.id, opt.name, options)}
                                        className={`
                                            w-full px-4 py-2.5 text-left flex items-center justify-between
                                            transition-colors duration-150
                                            ${isSelected
                                                ? 'bg-primary-500/10 text-primary-500'
                                                : 'text-app-text hover:bg-app-hover'
                                            }
                                        `}
                                    >
                                        <span className="truncate">{opt.name}</span>
                                        {isSelected && <Check size={16} className="text-primary-500 flex-shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty state - Opens UPWARD */}
                    {isOpen && options.length === 0 && !isLoading && (
                        <div className="absolute z-50 w-full bottom-full mb-2 py-4 rounded-xl border border-app bg-app-card shadow-xl text-center text-app-muted text-sm">
                            No options available
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('[data-location-selector]')) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div
            data-location-selector
            className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
        >
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
                fieldDisabled={!normalizedValue.country}
            />

            <SelectField
                label="District"
                field="district"
                options={districts}
                icon={Navigation}
                isLoading={loading.districts}
                placeholder="Select District"
                fieldDisabled={!normalizedValue.state}
            />

            <SelectField
                label="City/Area"
                field="city"
                options={cities}
                icon={Building2}
                isLoading={loading.cities}
                placeholder="Select City"
                fieldDisabled={!normalizedValue.district}
            />
        </div>
    );
};

export default LocationSelector;
