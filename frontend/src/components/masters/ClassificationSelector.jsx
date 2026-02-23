import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import mastersService from '@/api/services/mastersService';

/** Safely extract array from DRF paginated or direct array responses */
const toArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
};

/**
 * Classification Selector Component
 * Independent dropdowns for: SchemeType → Scheme, WorkType, ProjectCategory
 */
const ClassificationSelector = ({
    value = {},
    onChange,
    disabled = false,
    className = ''
}) => {
    const [schemeTypes, setSchemeTypes] = useState([]);
    const [schemes, setSchemes] = useState([]);
    const [workTypes, setWorkTypes] = useState([]);
    const [projectCategories, setProjectCategories] = useState([]);

    const [loading, setLoading] = useState({
        schemeTypes: true,
        schemes: false,
        workTypes: true,
        projectCategories: true,
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [stRes, wtRes, pcRes] = await Promise.all([
                mastersService.getSchemeTypes(),
                mastersService.getWorkTypes(),
                mastersService.getProjectCategories(),
            ]);
            setSchemeTypes(toArray(stRes.data));
            setWorkTypes(toArray(wtRes.data));
            setProjectCategories(toArray(pcRes.data));
        } catch (error) {
            console.error('Failed to fetch classification data:', error);
        } finally {
            setLoading(prev => ({
                ...prev,
                schemeTypes: false,
                workTypes: false,
                projectCategories: false
            }));
        }
    };

    const fetchSchemes = useCallback(async (schemeTypeId) => {
        if (!schemeTypeId) {
            setSchemes([]);
            return;
        }
        setLoading(prev => ({ ...prev, schemes: true }));
        try {
            const res = await mastersService.getSchemes({ scheme_type: schemeTypeId });
            setSchemes(toArray(res.data));
        } catch (error) {
            console.error('Failed to fetch schemes:', error);
            setSchemes([]);
        } finally {
            setLoading(prev => ({ ...prev, schemes: false }));
        }
    }, []);

    const handleSchemeTypeChange = (schemeTypeId) => {
        const schemeType = schemeTypes.find(st => st.id === schemeTypeId);
        onChange({
            ...value,
            schemeType: schemeTypeId,
            schemeTypeName: schemeType?.name || '',
            scheme: '',
            schemeName: '',
        });
        setSchemes([]);
        if (schemeTypeId) {
            fetchSchemes(schemeTypeId);
        }
    };

    const handleSchemeChange = (schemeId) => {
        const scheme = schemes.find(s => s.id === schemeId);
        onChange({
            ...value,
            scheme: schemeId,
            schemeName: scheme?.name || '',
        });
    };

    const handleWorkTypeChange = (workTypeId) => {
        const workType = workTypes.find(wt => wt.id === workTypeId);
        onChange({
            ...value,
            workType: workTypeId,
            workTypeName: workType?.name || '',
        });
    };

    const handleProjectCategoryChange = (categoryId) => {
        const category = projectCategories.find(c => c.id === categoryId);
        onChange({
            ...value,
            projectCategory: categoryId,
            projectCategoryName: category?.name || '',
        });
    };

    const selectClasses = `
    w-full px-3 py-2.5 rounded-lg border border-app
    bg-app-input text-app-text text-sm
    focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30
    outline-none transition-all appearance-none cursor-pointer
    disabled:bg-app-surface disabled:cursor-not-allowed disabled:text-app-muted
  `;

    const renderSelect = (label, val, options, onChangeHandler, isLoading, placeholder, isDisabled = false) => (
        <div className="relative">
            <label className="block text-sm font-medium text-app-text mb-1.5">{label}</label>
            <div className="relative">
                <select
                    value={val || ''}
                    onChange={(e) => onChangeHandler(e.target.value)}
                    disabled={isDisabled || isLoading}
                    className={selectClasses}
                >
                    <option value="">{isLoading ? 'Loading...' : placeholder}</option>
                    {(Array.isArray(options) ? options : []).map(opt => (
                        <option key={opt.id} value={opt.id}>
                            {opt.code} - {opt.name}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin text-app-muted" />
                    ) : (
                        <ChevronDown size={16} className="text-app-muted" />
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
            {renderSelect('Scheme Type', value.schemeType, schemeTypes, handleSchemeTypeChange, loading.schemeTypes, 'Select Scheme Type', disabled)}
            {renderSelect('Scheme', value.scheme, schemes, handleSchemeChange, loading.schemes, value.schemeType ? 'Select Scheme' : 'Select Scheme Type first', disabled || !value.schemeType)}
            {renderSelect('Work Type', value.workType, workTypes, handleWorkTypeChange, loading.workTypes, 'Select Work Type', disabled)}
            {renderSelect('Project Category', value.projectCategory, projectCategories, handleProjectCategoryChange, loading.projectCategories, 'Select Category', disabled)}
        </div>
    );
};

export default ClassificationSelector;
