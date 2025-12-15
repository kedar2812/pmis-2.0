import { useId } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Custom tooltip style
const tooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  backdropFilter: 'blur(12px)',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '12px',
  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
};

export const AnimatedBarChart = ({ data, dataKey, height = 300, color = '#10b981', name }) => {
  // Use stable ID for gradients
  const id = useId();
  const gradientId = `barGradient-${id.replace(/:/g, '')}`;
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={100} 
          stroke="#64748b" 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis 
          stroke="#64748b" 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
        />
        {name && <Legend />}
        <Bar 
          dataKey={dataKey} 
          fill={`url(#${gradientId})`} 
          radius={[8, 8, 0, 0]} 
          animationBegin={100}
          animationDuration={1200}
          animationEasing="ease-out"
        >
          {data.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`url(#${gradientId})`}
              style={{ 
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export const AnimatedLineChart = ({ data, dataKey, height = 300, color = '#8b5cf6', name }) => {
  // Use stable ID for gradients
  const id = useId();
  const gradientId = `lineGradient-${id.replace(/:/g, '')}`;
  const glowFilterId = `glow-${id.replace(/:/g, '')}`;
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id={glowFilterId}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={100} 
          stroke="#64748b"
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis 
          stroke="#64748b"
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        {name && <Legend />}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={3}
          dot={{ 
            fill: '#fff', 
            stroke: color,
            strokeWidth: 2,
            r: 5,
            filter: `url(#${glowFilterId})`
          }}
          activeDot={{ 
            r: 8, 
            fill: color,
            stroke: '#fff',
            strokeWidth: 2,
            filter: `url(#${glowFilterId})`
          }}
          animationBegin={200}
          animationDuration={1500}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Custom label renderer with animation
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show labels for very small slices

  return (
    <text 
      x={x} 
      y={y} 
      fill="#475569"
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      style={{ 
        fontSize: '12px', 
        fontWeight: 500,
        textShadow: '0 1px 2px rgba(255,255,255,0.8)'
      }}
    >
      {`${name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const AnimatedPieChart = ({
  data,
  dataKey,
  height = 300,
  colors = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'], // Emerald, Violet, Amber, Rose, Cyan
}) => {
  // Use stable ID for gradients and filters
  const id = useId();
  const baseId = id.replace(/:/g, '');
  const shadowFilterId = `pieShadow-${baseId}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <defs>
          {colors.map((color, index) => (
            <linearGradient key={index} id={`pieGradient-${baseId}-${index}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.8} />
            </linearGradient>
          ))}
          <filter id={shadowFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15"/>
          </filter>
        </defs>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={90}
          innerRadius={30}
          fill="#8884d8"
          dataKey={dataKey}
          animationBegin={0}
          animationDuration={1200}
          animationEasing="ease-out"
          paddingAngle={2}
          style={{ filter: `url(#${shadowFilterId})` }}
        >
          {data.map((_entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={`url(#pieGradient-${baseId}-${index % colors.length})`}
              stroke="#fff"
              strokeWidth={2}
              style={{ 
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
};






