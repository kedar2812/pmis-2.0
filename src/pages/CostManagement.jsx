import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/Card';

const CostManagement = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('common.cost') || 'Cost Management'}</h1>
        <p className="text-gray-600 mt-1">Manage project budgets, expenses, and financial forecasts.</p>
      </div>

      <Card>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center text-slate-500">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Cost Management Workspace</h3>
          <p className="max-w-md mx-auto">
            This workspace has been reset and is ready for the new implementation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostManagement;
