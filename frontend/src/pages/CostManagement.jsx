import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, PieChart, FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const CostManagement = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: '1. Fund Management',
      description: 'Step 1: Record Inflows (Grants, Loans, Allocations). You must have funds before you can budget.',
      icon: IndianRupee,
      path: '/cost/funds',
      color: 'bg-emerald-100 text-emerald-600',
      borderColor: 'border-emerald-200'
    },
    {
      title: '2. Budget Allocation',
      description: 'Step 2: Link Funds to Schedule Milestones. Enforces "No Money Without Time".',
      icon: PieChart,
      path: '/cost/budgeting',
      color: 'bg-blue-100 text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      title: '3. RA Billing',
      description: 'Step 3: Contractors submit bills against verified progress. System checks limits automatically.',
      icon: FileText,
      path: '/cost/billing',
      color: 'bg-amber-100 text-amber-600',
      borderColor: 'border-amber-200'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cost Management Workspace</h1>
        <p className="text-slate-500 dark:text-neutral-400 mt-2 text-lg">
          Follow the 3-step Government workflow to ensure financial discipline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {modules.map((mod) => (
          <Card
            key={mod.title}
            className={`cursor-pointer hover:shadow-xl transition-all duration-300 border-t-4 ${mod.borderColor}`}
            onClick={() => navigate(mod.path)}
          >
            <CardContent className="p-8 flex flex-col h-full">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${mod.color}`}>
                <mod.icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{mod.title}</h3>
              <p className="text-slate-600 dark:text-neutral-400 leading-relaxed flex-1">
                {mod.description}
              </p>
              <div className="mt-6 flex items-center text-primary-600 font-semibold group">
                Enter Module <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-6 bg-slate-50 dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-white">Need to update the Schedule?</h4>
          <p className="text-sm text-slate-500 dark:text-neutral-400">Milestones must be created before budgeting.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/scheduling')}>
          Go to Scheduling
        </Button>
      </div>
    </div>
  );
};

export default CostManagement;
