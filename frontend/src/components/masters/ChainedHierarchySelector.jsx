import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2, Building2 } from 'lucide-react';
import mastersService from '@/api/services/mastersService';

/**
 * Chained Hierarchy Selector Component
 * Provides dependent dropdowns: Zone → Circle → Division → SubDivision
 * 
 * @param {object} value - Current selection { zone, circle, division, subDivision }
 * @param {function} onChange - Called with updated selection object
 * @param {boolean} showSubDivision - Whether to show the 4th level
 * @param {boolean} disabled - Disable all selects
 */
const ChainedHierarchySelector = ({
    value = {},
    onChange,
    showSubDivision = true,
    disabled = false,
    className = ''
}) => {
    // Master data lists
    const [zones, setZones] = useState([]);
    const [circles, setCircles] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [subDivisions, setSubDivisions] = useState([]);

    // Loading states
    const [loading, setLoading] = useState({
        zones: true,
        circles: false,
        divisions: false,
        subDivisions: false,
    });

    // Fetch zones on mount
    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        setLoading(prev => ({ ...prev, zones: true }));
        try {
            const res = await mastersService.getZones();
            setZones(res.data.filter(z => z.status === 'Active'));
        } catch (error) {
            console.error('Failed to fetch zones:', error);
        } finally {
            setLoading(prev => ({ ...prev, zones: false }));
        }
    };

    // Fetch circles when zone changes
    const fetchCircles = useCallback(async (zoneId) => {
        if (!zoneId) {
            setCircles([]);
            return;
        }
        setLoading(prev => ({ ...prev, circles: true }));
        try {
            const res = await mastersService.getZoneCircles(zoneId);
            setCircles(res.data);
        } catch (error) {
            console.error('Failed to fetch circles:', error);
            // Fallback: filter from all circles
            try {
                const allCircles = await mastersService.getCircles({ zone: zoneId });
                setCircles(allCircles.data.filter(c => c.status === 'Active'));
            } catch {
                setCircles([]);
            }
        } finally {
            setLoading(prev => ({ ...prev, circles: false }));
        }
    }, []);

    // Fetch divisions when circle changes
    const fetchDivisions = useCallback(async (circleId) => {
        if (!circleId) {
            setDivisions([]);
            return;
        }
        setLoading(prev => ({ ...prev, divisions: true }));
        try {
            const res = await mastersService.getCircleDivisions(circleId);
            setDivisions(res.data);
        } catch (error) {
            console.error('Failed to fetch divisions:', error);
            try {
                const allDivisions = await mastersService.getDivisions({ circle: circleId });
                setDivisions(allDivisions.data.filter(d => d.status === 'Active'));
            } catch {
                setDivisions([]);
            }
        } finally {
            setLoading(prev => ({ ...prev, divisions: false }));
        }
    }, []);

    // Fetch subdivisions when division changes
    const fetchSubDivisions = useCallback(async (divisionId) => {
        if (!divisionId || !showSubDivision) {
            setSubDivisions([]);
            return;
        }
        setLoading(prev => ({ ...prev, subDivisions: true }));
        try {
            const res = await mastersService.getDivisionSubDivisions(divisionId);
            setSubDivisions(res.data);
        } catch (error) {
            console.error('Failed to fetch subdivisions:', error);
            try {
                const allSubs = await mastersService.getSubDivisions({ division: divisionId });
                setSubDivisions(allSubs.data);
            } catch {
                setSubDivisions([]);
            }
        } finally {
            setLoading(prev => ({ ...prev, subDivisions: false }));
        }
    }, [showSubDivision]);

    // Handle zone change
    const handleZoneChange = (zoneId) => {
        const zone = zones.find(z => z.id === zoneId);
        onChange({
            zone: zoneId,
            zoneName: zone?.name || '',
            circle: '',
            circleName: '',
            division: '',
            divisionName: '',
            subDivision: '',
            subDivisionName: '',
        });
        setCircles([]);
        setDivisions([]);
        setSubDivisions([]);
        if (zoneId) {
            fetchCircles(zoneId);
        }
    };

    // Handle circle change
    const handleCircleChange = (circleId) => {
        const circle = circles.find(c => c.id === circleId);
        onChange({
            ...value,
            circle: circleId,
            circleName: circle?.name || '',
            division: '',
            divisionName: '',
            subDivision: '',
            subDivisionName: '',
        });
        setDivisions([]);
        setSubDivisions([]);
        if (circleId) {
            fetchDivisions(circleId);
        }
    };

    // Handle division change
    const handleDivisionChange = (divisionId) => {
        const division = divisions.find(d => d.id === divisionId);
        onChange({
            ...value,
            division: divisionId,
            divisionName: division?.name || '',
            subDivision: '',
            subDivisionName: '',
        });
        setSubDivisions([]);
        if (divisionId && showSubDivision) {
            fetchSubDivisions(divisionId);
        }
    };

    // Handle subdivision change
    const handleSubDivisionChange = (subDivisionId) => {
        const subDiv = subDivisions.find(s => s.id === subDivisionId);
        onChange({
            ...value,
            subDivision: subDivisionId,
            subDivisionName: subDiv?.name || '',
        });
    };

    // Common select styles
    const selectClasses = `
    w-full px-3 py-2.5 rounded-lg border border-app
    bg-app-input text-app-text text-sm
    focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30
    outline-none transition-all appearance-none cursor-pointer
    disabled:bg-app-surface disabled:cursor-not-allowed disabled:text-app-muted
  `;

    const renderSelect = (label, value, options, onChange, isLoading, placeholder, disabled = false) => (
        <div className="relative">
            <label className="block text-sm font-medium text-app-text mb-1.5">
                {label}
            </label>
            <div className="relative">
                <select
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled || isLoading || options.length === 0}
                    className={selectClasses}
                >
                    <option value="">{isLoading ? 'Loading...' : placeholder}</option>
                    {options.map(opt => (
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
            {/* Zone */}
            {renderSelect(
                'Zone',
                value.zone,
                zones,
                handleZoneChange,
                loading.zones,
                'Select Zone',
                disabled
            )}

            {/* Circle */}
            {renderSelect(
                'Circle',
                value.circle,
                circles,
                handleCircleChange,
                loading.circles,
                value.zone ? 'Select Circle' : 'Select Zone first',
                disabled || !value.zone
            )}

            {/* Division */}
            {renderSelect(
                'Division',
                value.division,
                divisions,
                handleDivisionChange,
                loading.divisions,
                value.circle ? 'Select Division' : 'Select Circle first',
                disabled || !value.circle
            )}

            {/* SubDivision */}
            {showSubDivision && renderSelect(
                'Sub-Division',
                value.subDivision,
                subDivisions,
                handleSubDivisionChange,
                loading.subDivisions,
                value.division ? 'Select Sub-Division' : 'Select Division first',
                disabled || !value.division
            )}
        </div>
    );
};

export default ChainedHierarchySelector;
