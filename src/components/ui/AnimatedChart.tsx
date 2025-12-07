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

interface AnimatedBarChartProps {
  data: any[];
  dataKey: string;
  height?: number;
  color?: string;
  name?: string;
}

export const AnimatedBarChart = ({ data, dataKey, height = 300, color = '#2546eb', name }: AnimatedBarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#64748b" />
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
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} animationDuration={1000}>
          {data.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={color}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

interface AnimatedLineChartProps {
  data: any[];
  dataKey: string;
  height?: number;
  color?: string;
  name?: string;
}

export const AnimatedLineChart = ({ data, dataKey, height = 300, color = '#2546eb', name }: AnimatedLineChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#64748b" />
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
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={3}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={1000}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

interface AnimatedPieChartProps {
  data: any[];
  dataKey: string;
  height?: number;
  colors?: string[];
  nameKey?: string;
}

export const AnimatedPieChart = ({
  data,
  dataKey,
  height = 300,
  colors = ['#2546eb', '#14b8a6', '#f59e0b', '#f97316'],
}: AnimatedPieChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
          animationBegin={0}
          animationDuration={800}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};


