import { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, AreaChart, Loader2 } from 'lucide-react';
import { AnimatedBarChart, AnimatedLineChart, AnimatedPieChart } from './AnimatedChart';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

// Skeleton loader component for charts
const ChartSkeleton = ({ height }) => (
  <div className="w-full relative overflow-hidden" style={{ height }}>
    {/* Animated gradient background */}
    <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse rounded-xl" />
    
    {/* Shimmer effect */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
    
    {/* Skeleton bars */}
    <div className="absolute bottom-8 left-12 right-8 flex items-end justify-around gap-4">
      {[65, 85, 45, 70, 55].map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 bg-slate-200/80 rounded-t-lg"
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{
            duration: 0.5,
            delay: i * 0.1,
            ease: 'easeOut',
          }}
          style={{ maxHeight: height - 60 }}
        />
      ))}
    </div>
    
    {/* Loading indicator */}
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg"
      >
        <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
        <span className="text-sm font-medium text-slate-600">Loading chart...</span>
      </motion.div>
    </div>
  </div>
);

export const DynamicChart = ({
  data,
  dataKey,
  height = 300,
  colors = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'],
  name,
  nameKey = 'name',
  title,
  defaultType = 'bar',
  loading: externalLoading,
}) => {
  const [chartType, setChartType] = useState(defaultType);
  const [isLoading, setIsLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);

  // Simulate initial loading animation
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    const showTimer = setTimeout(() => {
      setShowChart(true);
    }, 900);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(showTimer);
    };
  }, []);

  // Handle chart type change with loading animation
  const handleChartTypeChange = (type) => {
    if (type === chartType) return;
    setShowChart(false);
    setTimeout(() => {
      setChartType(type);
      setShowChart(true);
    }, 200);
  };

  const loading = externalLoading !== undefined ? externalLoading : isLoading;

  const chartTypes = [
    { type: 'bar', icon: BarChart3, label: 'Bar' },
    { type: 'line', icon: LineChartIcon, label: 'Line' },
    { type: 'pie', icon: PieChartIcon, label: 'Pie' },
    { type: 'area', icon: AreaChart, label: 'Area' },
  ];

  // Use stable ID for gradients to avoid conflicts between multiple charts
  const id = useId();
  const gradientId = `areaGradient-${id.replace(/:/g, '')}`;

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return <AnimatedBarChart data={data} dataKey={dataKey} height={height} color={colors[0]} name={name} />;
      case 'line':
        return <AnimatedLineChart data={data} dataKey={dataKey} height={height} color={colors[1]} name={name} />;
      case 'pie':
        return <AnimatedPieChart data={data} dataKey={dataKey} height={height} colors={colors} nameKey={nameKey} />;
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RechartsAreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[2]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colors[2]} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={nameKey} angle={-45} textAnchor="end" height={100} stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '8px',
                }}
              />
              {name && <Legend />}
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={colors[2]}
                fill={`url(#${gradientId})`}
                strokeWidth={3}
                animationDuration={1000}
              />
            </RechartsAreaChart>
          </ResponsiveContainer>
        );
      default:
        return <AnimatedBarChart data={data} dataKey={dataKey} height={height} color={colors[0]} name={name} />;
    }
  };

  return (
    <div className="w-full">
      {(title || true) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
          <div className="flex items-center gap-2 bg-slate-100/50 rounded-lg p-1">
            {chartTypes.map(({ type, icon: Icon, label }) => (
              <motion.button
                key={type}
                onClick={() => handleChartTypeChange(type)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                  chartType === type
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={`Switch to ${label} chart`}
                disabled={loading}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChartSkeleton height={height} />
          </motion.div>
        ) : (
          <motion.div
            key={`chart-${chartType}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: showChart ? 1 : 0, 
              y: showChart ? 0 : 20,
              scale: showChart ? 1 : 0.95
            }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.3 }
            }}
          >
            {renderChart()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Default export for compatibility
export default DynamicChart;



