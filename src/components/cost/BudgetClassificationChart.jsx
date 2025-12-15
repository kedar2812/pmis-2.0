import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const BudgetClassificationChart = ({ budgets }) => {
  const chartData = useMemo(() => {
    // Group by source and utilization
    const sourceUtilizationMap = {};

    budgets.forEach((budget) => {
      const source = budget.source || 'Unknown';
      const utilization = budget.utilization || 'Other';
      
      if (!sourceUtilizationMap[source]) {
        sourceUtilizationMap[source] = {};
      }
      
      if (!sourceUtilizationMap[source][utilization]) {
        sourceUtilizationMap[source][utilization] = 0;
      }
      
      sourceUtilizationMap[source][utilization] += budget.allocated;
    });

    // Convert to chart format
    const sources = Object.keys(sourceUtilizationMap);
    const utilizations = ['Infra', 'Tech', 'Land'];
    
    return sources.map((source) => {
      const data = { source };
      utilizations.forEach((util) => {
        data[util] = (sourceUtilizationMap[source][util] || 0) / 10000000; // Convert to crores
      });
      return data;
    });
  }, [budgets]);

  const colors = {
    Infra: '#10b981',
    Tech: '#8b5cf6',
    Land: '#f59e0b',
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="source" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip
          formatter={(value) => `₹${value.toFixed(2)} Cr`}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px',
          }}
        />
        <Legend />
        <Bar dataKey="Infra" stackId="a" fill={colors.Infra} name="Infrastructure" />
        <Bar dataKey="Tech" stackId="a" fill={colors.Tech} name="Technology" />
        <Bar dataKey="Land" stackId="a" fill={colors.Land} name="Land" />
      </BarChart>
    </ResponsiveContainer>
  );
};





