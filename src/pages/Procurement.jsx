import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    Search,
    Plus,
    Filter,
    MoreVertical,
    Mail,
    Phone,
    MapPin,
    FileBadge
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';

const Procurement = () => {
    const { t } = useLanguage();
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');

    // Mock data for contractors based on CSV requirements
    const [contractors] = useState([
        {
            id: 1,
            name: 'Larsen & Toubro Construction',
            pan: 'AAACL1234M',
            gstin: '29AAACL1234M1Z5',
            email: 'contact@lntecc.com',
            mobile: '+91 9876543210',
            address: {
                building: 'L&T Campus',
                street: 'Bellary Road',
                area: 'Hebbal',
                city: 'Bengaluru',
                state: 'Karnataka',
                zip: '560092'
            },
            status: 'Active',
            projects: 3
        },
        {
            id: 2,
            name: 'NCC Limited',
            pan: 'BBBCN5678K',
            gstin: '29BBBCN5678K1Z2',
            email: 'info@nccltd.in',
            mobile: '+91 8765432109',
            address: {
                building: 'NCC House',
                street: 'Madhapur',
                area: 'Hitech City',
                city: 'Hyderabad',
                state: 'Telangana',
                zip: '500081'
            },
            status: 'Active',
            projects: 1
        }
    ]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-slate-900">Procurement</h1>
                    <p className="text-slate-500 mt-1">Manage contractors, vendors, and suppliers</p>
                </div>
                <Button className="flex items-center gap-2 bg-primary-950 text-white hover:bg-primary-900 shadow-lg shadow-primary-950/20">
                    <Plus size={18} />
                    <span>Add Contractor</span>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Contractors', value: '12', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Contracts', value: '8', icon: FileBadge, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pending Approvals', value: '2', icon: Filter, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="p-6 flex items-center gap-4 hover:shadow-lg transition-shadow duration-300">
                            <div className={`p-4 rounded-xl ${stat.bg}`}>
                                <stat.icon className={stat.color} size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Search and Filter Bar */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search contractors by name, PAN, or GSTIN..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex items-center gap-2">
                            <Filter size={18} />
                            <span>Filter</span>
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Contractors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contractors.map((contractor, index) => (
                    <motion.div
                        key={contractor.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card className="h-full hover:shadow-xl transition-all duration-300 group cursor-pointer border-slate-200/60">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 rounded-lg bg-primary-50 text-primary-700 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                                        <Building2 size={24} />
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                                        {contractor.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            {contractor.status}
                                        </span>
                                        <span className="text-sm text-slate-500">• {contractor.projects} Active Projects</span>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <FileBadge size={16} className="text-slate-400" />
                                        <span className="font-mono">{contractor.gstin}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <MapPin size={16} className="text-slate-400" />
                                        <span className="truncate">{contractor.address.city}, {contractor.address.state}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <Mail size={16} className="text-slate-400" />
                                        <span className="truncate">{contractor.email}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Procurement;
