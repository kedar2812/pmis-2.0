/**
 * EVMSCurveChart - Earned Value Management S-Curve Visualization
 * 
 * Displays PV (Planned Value), EV (Earned Value), and AC (Actual Cost)
 * time-series data in a professional S-Curve chart format.
 * 
 * Features:
 * - Three-line chart (PV, EV, AC)
 * - Interactive tooltips with full metrics
 * - Performance indicators (CPI, SPI)
 * - Responsive design with dark mode support
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';
import evmService from '../../api/services/evmService';

// Custom tooltip for S-Curve
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload || {};

    return (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-xl border border-app-subtle min-w-[200px]">
            <p className="font-semibold text-slate-800 dark:text-white mb-2 border-b border-app-subtle pb-2">
                {label}
            </p>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span className="text-slate-600 dark:text-slate-300">Planned (PV)</span>
                    </span>
                    <span className="font-medium text-slate-800 dark:text-white">
                        {evmService.formatIndianCurrency(data.pv || 0)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-slate-600 dark:text-slate-300">Earned (EV)</span>
                    </span>
                    <span className="font-medium text-slate-800 dark:text-white">
                        {evmService.formatIndianCurrency(data.ev || 0)}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="text-slate-600 dark:text-slate-300">Actual (AC)</span>
                    </span>
                    <span className="font-medium text-slate-800 dark:text-white">
                        {evmService.formatIndianCurrency(data.ac || 0)}
                    </span>
                </div>
                {data.planned_percent !== undefined && (
                    <div className="pt-2 mt-2 border-t border-app-subtle text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex justify-between">
                            <span>Planned %:</span>
                            <span>{data.planned_percent?.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Actual %:</span>
                            <span>{data.actual_percent?.toFixed(1)}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Performance Badge Component
const PerformanceBadge = ({ label, value, threshold = 1.0 }) => {
    const isGood = value >= threshold;
    const isWarning = value >= 0.9 && value < threshold;

    return (
        <div className="flex flex-col items-center p-3 rounded-lg bg-app-secondary">
            <span className="text-xs text-app-muted mb-1">{label}</span>
            <span className={`text-2xl font-bold ${isGood ? 'text-green-600 dark:text-green-400' :
                isWarning ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                }`}>
                {value?.toFixed(2) || '—'}
            </span>
            <span className={`text-xs mt-1 flex items-center gap-1 ${isGood ? 'text-green-600 dark:text-green-400' :
                isWarning ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                }`}>
                {isGood ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {isGood ? 'On Track' : isWarning ? 'Warning' : 'At Risk'}
            </span>
        </div>
    );
};

// Variance Display Component
const VarianceCard = ({ label, value, suffix = '' }) => {
    const status = evmService.getVarianceStatus(value);

    // Format value - use currency formatting only if not a percentage
    const formattedValue = suffix === '%'
        ? `${Math.abs(value || 0).toFixed(1)}`
        : evmService.formatIndianCurrency(Math.abs(value || 0));

    return (
        <div className="text-center p-2 bg-app-secondary rounded-lg">
            <span className="text-xs text-app-muted block mb-1">{label}</span>
            <span className={`text-lg font-semibold ${status.color}`}>
                {status.icon} {formattedValue}{suffix}
            </span>
        </div>
    );
};

const EVMSCurveChart = ({
    projectId,
    height = 320,
    showMetricsPanel = true,
    className = ''
}) => {
    const [data, setData] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch S-Curve data and metrics
    const fetchData = async () => {
        if (!projectId) return;

        setLoading(true);
        setError(null);

        try {
            const [sCurveRes, metricsRes] = await Promise.all([
                evmService.getSCurveData(projectId),
                evmService.getMetrics(projectId)
            ]);

            setData(sCurveRes.data?.data || []);
            setMetrics(metricsRes.data || null);
        } catch (err) {
            console.error('Failed to fetch EVM data:', err);
            setError('Failed to load EVM data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [projectId]);

    // Format Y-axis values
    const formatYAxis = (value) => {
        if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `${(value / 100000).toFixed(0)}L`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return value;
    };

    // Calculate Y-axis domain
    const yDomain = useMemo(() => {
        if (!data.length) return [0, 100];
        const maxValue = Math.max(
            ...data.map(d => Math.max(d.pv || 0, d.ev || 0, d.ac || 0, d.bac || 0))
        );
        return [0, Math.ceil(maxValue * 1.1)];
    }, [data]);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-app-card rounded-lg ${className}`} style={{ height }}>
                <div className="flex items-center gap-2 text-app-muted">
                    <RefreshCw className="animate-spin" size={20} />
                    <span>Loading EVM data...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-app-card rounded-lg ${className}`} style={{ height }}>
                <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className={`flex flex-col items-center justify-center bg-app-card rounded-lg ${className}`} style={{ height }}>
                <BarChart3 size={40} className="text-slate-400 mb-2" />
                <span className="text-app-muted">No S-Curve data available</span>
                <span className="text-xs text-slate-400 mt-1">Create EVM snapshots to visualize progress</span>
            </div>
        );
    }

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Metrics Summary Panel - Enhanced with more details */}
            {showMetricsPanel && metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                    <PerformanceBadge label="CPI" value={metrics.cpi} />
                    <PerformanceBadge label="SPI" value={metrics.spi} />
                    <VarianceCard label="Cost Variance" value={metrics.cv} />
                    <VarianceCard label="CV %" value={metrics.cv_percent} suffix="%" />
                    <VarianceCard label="Schedule Variance" value={metrics.sv} />
                    <VarianceCard label="SV %" value={metrics.sv_percent} suffix="%" />
                </div>
            )}

            {/* S-Curve Chart */}
            <div className="bg-app-card rounded-lg p-2">
                <ResponsiveContainer width="100%" height={height}>
                    <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                        <defs>
                            <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            className="dark:opacity-20"
                        />

                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e2e8f0' }}
                        />

                        <YAxis
                            tickFormatter={formatYAxis}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e2e8f0' }}
                            domain={yDomain}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <Legend
                            verticalAlign="top"
                            height={36}
                            iconType="line"
                            wrapperStyle={{ fontSize: '12px' }}
                        />

                        {/* BAC Reference Line */}
                        {metrics?.bac && (
                            <ReferenceLine
                                y={metrics.bac}
                                stroke="#94a3b8"
                                strokeDasharray="5 5"
                                label={{
                                    value: `BAC: ${evmService.formatIndianCurrency(metrics.bac)}`,
                                    position: 'right',
                                    fill: '#64748b',
                                    fontSize: 10
                                }}
                            />
                        )}

                        {/* Area under PV for visual effect */}
                        <Area
                            type="monotone"
                            dataKey="pv"
                            fill="url(#pvGradient)"
                            stroke="none"
                        />

                        {/* PV Line - Blue */}
                        <Line
                            type="monotone"
                            dataKey="pv"
                            name="Planned Value (PV)"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#3b82f6' }}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        />

                        {/* EV Line - Green */}
                        <Line
                            type="monotone"
                            dataKey="ev"
                            name="Earned Value (EV)"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#10b981' }}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        />

                        {/* AC Line - Red */}
                        <Line
                            type="monotone"
                            dataKey="ac"
                            name="Actual Cost (AC)"
                            stroke="#ef4444"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#ef4444' }}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* EAC/VAC Summary */}
            {metrics && (
                <div className="mt-4 pt-4 border-t border-app-subtle flex justify-around text-center">
                    <div>
                        <span className="text-xs text-app-muted block">Est. At Completion (EAC)</span>
                        <span className="text-lg font-semibold text-slate-800 dark:text-white">
                            {evmService.formatIndianCurrency(metrics.eac || 0)}
                        </span>
                    </div>
                    <div>
                        <span className="text-xs text-app-muted block">Est. To Complete (ETC)</span>
                        <span className="text-lg font-semibold text-slate-800 dark:text-white">
                            {evmService.formatIndianCurrency(metrics.etc || 0)}
                        </span>
                    </div>
                    <div>
                        <span className="text-xs text-app-muted block">Variance At Completion</span>
                        <span className={`text-lg font-semibold ${metrics.vac >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                            {metrics.vac >= 0 ? '+' : ''}{evmService.formatIndianCurrency(metrics.vac || 0)}
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default EVMSCurveChart;
