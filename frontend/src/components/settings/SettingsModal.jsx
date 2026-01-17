import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    X, Settings, Users, Database, GitBranch, Plug, Bell,
    Shield, ChevronRight, Search, User, KeyRound, Clock,
    Building2, Mail, MessageSquare, Info,
    Globe, Moon, Plus, Edit2, Trash2, Check, XCircle, RefreshCw, Eye,
    Save, GripVertical, FileText, MapPin, Calculator, Download, Filter, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/api/services/userService';
import mastersService from '@/api/services/mastersService';
import settingsService from '@/api/services/settingsService';
import api from '@/api/client';

// Import the full UserManagement page component
import UserManagement from '@/pages/UserManagement';

// Permission list for roles
const ALL_PERMISSIONS = [
    'dashboard:view', 'dashboard:edit', 'scheduling:view', 'scheduling:edit',
    'cost:view', 'cost:edit', 'risk:view', 'risk:edit', 'gis:view', 'bim:view',
    'users:manage', 'projects:create', 'projects:edit', 'edms:view', 'edms:upload',
    'billing:view', 'billing:create', 'workflow:manage', 'masters:manage', 'audit:view'
];

// User roles for workflows
const USER_ROLES = ['SPV_Official', 'PMNC_Team', 'EPC_Contractor', 'Consultant_Design', 'Govt_Department', 'NICDC_HQ'];
const WORKFLOW_ACTIONS = ['Verify', 'Approve', 'Review', 'Sign', 'Submit', 'Reject'];

// Master data tabs
const MASTER_TABS = [
    { id: 'hierarchy', label: 'Hierarchy', icon: Building2, color: 'emerald' },
    { id: 'geography', label: 'Geography', icon: MapPin, color: 'blue' },
    { id: 'classification', label: 'Classification', icon: FileText, color: 'purple' },
    { id: 'entities', label: 'Contractors', icon: Users, color: 'amber' },
    { id: 'etp', label: 'ETP Charges', icon: Calculator, color: 'rose' },
];

/**
 * Settings Modal Component - Complete Hub with All Sections Functional
 */
const SettingsModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('users');
    const [searchQuery, setSearchQuery] = useState('');
    const [saveMessage, setSaveMessage] = useState('');
    const [settings, setSettings] = useState(settingsService.getDefaultSettings());

    useEffect(() => {
        const saved = settingsService.getSettings();
        if (saved) setSettings(prev => ({ ...prev, ...saved }));
    }, []);

    const updateSetting = useCallback((key, value) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            settingsService.saveSettings(newSettings);
            setSaveMessage('Settings saved');
            setTimeout(() => setSaveMessage(''), 2000);
            return newSettings;
        });
    }, []);

    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const sections = [
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'roles', label: 'Roles & Permissions', icon: KeyRound },
        { id: 'masters', label: 'Master Data', icon: Database },
        { id: 'workflow', label: 'Workflow Config', icon: GitBranch },
        { id: 'integrations', label: 'Integrations', icon: Plug },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'system', label: 'System', icon: Settings },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'audit', label: 'Audit Logs', icon: Activity },
    ];

    const filteredSections = sections.filter(s =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[100]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-4 md:inset-10 lg:inset-16 z-[101] flex"
                    >
                        <div className="w-full h-full bg-app-card/90 backdrop-blur-xl rounded-3xl border border-app-subtle shadow-[0_32px_64px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-neutral-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl">
                                        <Settings className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-app-heading">Settings</h2>
                                        <p className="text-xs text-app-muted">Manage your PMIS configuration</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {saveMessage && (
                                        <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                                            <Check size={14} /> {saveMessage}
                                        </span>
                                    )}
                                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl">
                                        <X size={20} className="text-slate-500 dark:text-neutral-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Sidebar */}
                                <div className="w-64 border-r border-app-subtle flex flex-col bg-app-secondary">
                                    <div className="p-4">
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search settings..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-neutral-900 dark:text-white border border-slate-200 dark:border-neutral-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>
                                    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                                        {filteredSections.map((section) => (
                                            <button
                                                key={section.id}
                                                onClick={() => setActiveSection(section.id)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === section.id
                                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                                    : 'text-slate-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 hover:shadow-sm'
                                                    }`}
                                            >
                                                <section.icon size={18} />
                                                <span className="text-sm font-medium">{section.label}</span>
                                                <ChevronRight size={14} className="ml-auto opacity-50" />
                                            </button>
                                        ))}
                                    </nav>
                                    <div className="p-4 border-t border-slate-200/50 dark:border-neutral-700/50">
                                        <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-neutral-900 rounded-xl">
                                            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-violet-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-sm font-medium">
                                                    {user?.first_name?.[0] || 'A'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 dark:text-white truncate">{user?.first_name || 'Admin'}</p>
                                                <p className="text-xs text-slate-400 dark:text-neutral-500 truncate">{user?.role || 'Super Admin'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeSection}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                        >
                                            {activeSection === 'users' && <UserManagement />}
                                            {activeSection === 'roles' && <RolesPermissionsSection />}
                                            {activeSection === 'masters' && <MasterDataSection navigate={navigate} onClose={onClose} />}
                                            {activeSection === 'workflow' && <WorkflowConfigSection />}
                                            {activeSection === 'integrations' && <IntegrationsSection settings={settings} updateSetting={updateSetting} />}
                                            {activeSection === 'notifications' && <NotificationsSection settings={settings} updateSetting={updateSetting} />}
                                            {activeSection === 'system' && <SystemSection settings={settings} updateSetting={updateSetting} />}
                                            {activeSection === 'security' && <SecuritySection settings={settings} updateSetting={updateSetting} />}
                                            {activeSection === 'audit' && <AuditLogsSection />}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

// Helper Components
const SectionHeader = ({ title, description }) => (
    <div className="mb-6">
        <h3 className="text-lg font-bold text-app-heading">{title}</h3>
        {description && <p className="text-sm text-app-muted mt-1">{description}</p>}
    </div>
);

const SettingsCard = ({ children, className = '' }) => (
    <div className={`bg-app-card rounded-2xl border border-app-subtle p-6 ${className}`}>{children}</div>
);

const SettingsRow = ({ icon: Icon, title, description, children }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-neutral-800 last:border-0">
        <div className="flex items-center gap-4">
            {Icon && <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-lg"><Icon size={18} className="text-slate-600 dark:text-neutral-300" /></div>}
            <div>
                <p className="text-sm font-medium text-slate-700 dark:text-white">{title}</p>
                {description && <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">{description}</p>}
            </div>
        </div>
        <div>{children}</div>
    </div>
);

const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
        <RefreshCw className="animate-spin text-blue-500" size={24} />
    </div>
);

// User Details Popup
const UserDetailsPopup = ({ user, onClose, onToggleStatus }) => {
    const [isToggling, setIsToggling] = useState(false);
    const roleLabels = { 'SPV_Official': 'SPV Official', 'NICDC_HQ': 'NICDC HQ', 'PMNC_Team': 'PMNC Team', 'EPC_Contractor': 'EPC Contractor' };
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

    const handleToggle = async () => {
        setIsToggling(true);
        try { await onToggleStatus(); setTimeout(() => onClose(), 500); }
        catch (e) { console.error(e); setIsToggling(false); }
    };

    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm border border-white/30"
                onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 p-2 hover:bg-slate-100 rounded-full">
                    <X size={18} className="text-slate-600" />
                </button>
                <div className="p-4 text-center border-b border-slate-200/50">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl font-bold text-white">{(user.first_name || 'U')[0].toUpperCase()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{user.first_name} {user.last_name}</h3>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {user.is_active ? '● Active' : '○ Inactive'}
                    </span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-xs text-slate-400">Role</span><p className="font-medium">{roleLabels[user.role] || user.role}</p></div>
                    <div><span className="text-xs text-slate-400">Department</span><p className="font-medium">{user.department || 'N/A'}</p></div>
                    <div><span className="text-xs text-slate-400">Joined</span><p className="font-medium">{formatDate(user.date_joined)}</p></div>
                    <div><span className="text-xs text-slate-400">Last Login</span><p className="font-medium">{formatDate(user.last_login)}</p></div>
                </div>
                <div className="p-4 bg-slate-50/80 flex gap-2 border-t">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium bg-white border rounded-xl hover:bg-slate-100">Close</button>
                    <button onClick={handleToggle} disabled={isToggling}
                        className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 ${user.is_active ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                            }`}>
                        {isToggling ? <RefreshCw size={16} className="animate-spin" /> : user.is_active ? <><XCircle size={16} /> Deactivate</> : <><Check size={16} /> Activate</>}
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

// ============ USER MANAGEMENT SECTION ============
const UserManagementSection = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await userService.getUsers();
            const data = response?.data || response;
            setUsers(Array.isArray(data) ? data : data?.results || []);
        } catch (e) {
            console.error('Failed to load users:', e);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId) => {
        try {
            await userService.toggleUserStatus(userId);
            await loadUsers();
            toast.success('Status updated');
        } catch (e) {
            console.error(e);
            toast.error('Failed to update status');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div>
            <SectionHeader title="User Management" description="Manage user accounts and access permissions" />
            <SettingsCard>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-slate-700">All Users ({users.length})</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">User</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Role</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Status</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs font-medium">{(u.first_name || u.email || 'U')[0].toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{u.first_name} {u.last_name}</p>
                                                <p className="text-xs text-slate-500">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">{u.role}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button onClick={() => setSelectedUser(u)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SettingsCard>
            <AnimatePresence>
                {selectedUser && <UserDetailsPopup user={selectedUser} onClose={() => setSelectedUser(null)} onToggleStatus={() => handleToggleStatus(selectedUser.id)} />}
            </AnimatePresence>
        </div>
    );
};

// ============ ROLES & PERMISSIONS SECTION ============
const RolesPermissionsSection = () => {
    const [roles, setRoles] = useState({
        SPV_Official: { permissions: ALL_PERMISSIONS, accessLevel: 'Full Admin' },
        PMNC_Team: { permissions: ['dashboard:view', 'scheduling:view', 'cost:view', 'projects:view'], accessLevel: 'Manager' },
        EPC_Contractor: { permissions: ['dashboard:view', 'scheduling:view', 'billing:view', 'billing:create'], accessLevel: 'Contributor' },
    });
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [newRoleName, setNewRoleName] = useState('');

    const handleSelectRole = (roleKey) => { setSelectedRole(roleKey); setSelectedPermissions(roles[roleKey]?.permissions || []); };
    const handleTogglePermission = (p) => setSelectedPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    const handleSaveRole = () => {
        if (!selectedRole) return;
        setRoles(prev => ({ ...prev, [selectedRole]: { ...prev[selectedRole], permissions: selectedPermissions } }));
        toast.success('Role permissions updated');
    };
    const handleCreateRole = () => {
        if (!newRoleName.trim()) { toast.error('Enter role name'); return; }
        const key = newRoleName.replace(/\s+/g, '_');
        if (roles[key]) { toast.error('Role exists'); return; }
        setRoles(prev => ({ ...prev, [key]: { permissions: [], accessLevel: 'Custom' } }));
        setSelectedRole(key); setSelectedPermissions([]); setNewRoleName('');
        toast.success('Role created');
    };
    const handleDeleteRole = (k) => {
        if (window.confirm(`Delete ${k}?`)) {
            const n = { ...roles }; delete n[k]; setRoles(n);
            if (selectedRole === k) { setSelectedRole(null); setSelectedPermissions([]); }
            toast.success('Role deleted');
        }
    };

    return (
        <div>
            <SectionHeader title="Roles & Permissions" description="Configure user roles and access control" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SettingsCard>
                    <div className="flex items-center gap-2 mb-4">
                        <input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="New role name"
                            className="flex-1 px-3 py-2 text-sm bg-app-input text-app-text border border-app-border rounded-lg placeholder:text-app-muted" onKeyPress={(e) => e.key === 'Enter' && handleCreateRole()} />
                        <button onClick={handleCreateRole} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Plus size={16} /></button>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(roles).map(([key, data]) => (
                            <div key={key} onClick={() => handleSelectRole(key)}
                                className={`p-3 rounded-lg border cursor-pointer ${selectedRole === key ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-app-border hover:border-app-border-hover hover:bg-app-layer-2'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-sm text-app-heading">{key.replace(/_/g, ' ')}</p>
                                        <p className="text-xs text-app-muted">{data.accessLevel} • {data.permissions.length} permissions</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(key); }} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </SettingsCard>
                <div className="lg:col-span-2">
                    <SettingsCard>
                        {selectedRole ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold flex items-center gap-2"><Shield size={18} /> {selectedRole.replace(/_/g, ' ')}</h4>
                                    <button onClick={handleSaveRole} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-primary-700">
                                        <Save size={16} /> Save
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {ALL_PERMISSIONS.map((p) => (
                                        <div key={p} className="flex items-center justify-between p-3 bg-app-subtle rounded-xl border border-app-border">
                                            <span className="text-sm font-medium text-app-text">{p}</span>
                                            <Toggle
                                                size="sm"
                                                checked={selectedPermissions.includes(p)}
                                                onChange={() => handleTogglePermission(p)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="py-12 text-center text-app-muted">Select a role to manage permissions</div>
                        )}
                    </SettingsCard>
                </div>
            </div>
        </div>
    );
};

// ============ MASTER DATA SECTION ============
// Tab color configuration for unique colors per master type
const TAB_COLORS = {
    hierarchy: { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', header: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' },
    geography: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', header: 'bg-blue-50 border-blue-200', text: 'text-blue-600' },
    classification: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', header: 'bg-purple-50 border-purple-200', text: 'text-purple-600' },
    entities: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', header: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
    etp: { bg: 'bg-rose-500', hover: 'hover:bg-rose-600', header: 'bg-rose-50 border-rose-200', text: 'text-rose-600' },
};

const MasterDataSection = ({ navigate, onClose }) => {
    const [activeTab, setActiveTab] = useState('hierarchy');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmModal, setConfirmModal] = useState({ open: false, item: null, type: null, newStatus: null });
    const [updating, setUpdating] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [allDataLoaded, setAllDataLoaded] = useState(false);
    const [data, setData] = useState({
        zones: [], circles: [], divisions: [], subdivisions: [],
        districts: [], towns: [],
        schemeTypes: [], schemes: [], workTypes: [], projectCategories: [],
        contractors: [],
        etpCharges: []
    });

    // Load data for the current tab
    useEffect(() => {
        if (!isSearchMode) {
            fetchTabData(activeTab);
        }
    }, [activeTab, isSearchMode]);

    // When search query changes, load all data for unified search
    useEffect(() => {
        if (searchQuery.trim()) {
            setIsSearchMode(true);
            if (!allDataLoaded) {
                fetchAllData();
            }
        } else {
            setIsSearchMode(false);
        }
    }, [searchQuery]);

    const fetchTabData = async (tab) => {
        setLoading(true);
        try {
            switch (tab) {
                case 'hierarchy':
                    const [z, c, d, s] = await Promise.all([
                        mastersService.getZones(), mastersService.getCircles(),
                        mastersService.getDivisions(), mastersService.getSubDivisions()
                    ]);
                    setData(prev => ({ ...prev, zones: z.data || [], circles: c.data || [], divisions: d.data || [], subdivisions: s.data || [] }));
                    break;
                case 'geography':
                    const [dist, towns] = await Promise.all([mastersService.getDistricts(), mastersService.getTowns()]);
                    setData(prev => ({ ...prev, districts: dist.data || [], towns: towns.data || [] }));
                    break;
                case 'classification':
                    const [st, sc, wt, pc] = await Promise.all([
                        mastersService.getSchemeTypes(), mastersService.getSchemes(),
                        mastersService.getWorkTypes(), mastersService.getProjectCategories()
                    ]);
                    setData(prev => ({ ...prev, schemeTypes: st.data || [], schemes: sc.data || [], workTypes: wt.data || [], projectCategories: pc.data || [] }));
                    break;
                case 'entities':
                    const contractors = await mastersService.getContractors();
                    setData(prev => ({ ...prev, contractors: contractors.data || [] }));
                    break;
                case 'etp':
                    const etp = await mastersService.getETPCharges();
                    setData(prev => ({ ...prev, etpCharges: etp.data || [] }));
                    break;
            }
        } catch (e) { console.error(e); toast.error('Failed to load data'); }
        finally { setLoading(false); }
    };

    // Fetch ALL data for unified search across all master types
    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [z, c, d, s, dist, towns, st, sc, wt, pc, contractors, etp] = await Promise.all([
                mastersService.getZones(), mastersService.getCircles(),
                mastersService.getDivisions(), mastersService.getSubDivisions(),
                mastersService.getDistricts(), mastersService.getTowns(),
                mastersService.getSchemeTypes(), mastersService.getSchemes(),
                mastersService.getWorkTypes(), mastersService.getProjectCategories(),
                mastersService.getContractors(), mastersService.getETPCharges()
            ]);
            setData({
                zones: z.data || [], circles: c.data || [], divisions: d.data || [], subdivisions: s.data || [],
                districts: dist.data || [], towns: towns.data || [],
                schemeTypes: st.data || [], schemes: sc.data || [], workTypes: wt.data || [], projectCategories: pc.data || [],
                contractors: contractors.data || [],
                etpCharges: etp.data || []
            });
            setAllDataLoaded(true);
        } catch (e) { console.error(e); toast.error('Failed to load search data'); }
        finally { setLoading(false); }
    };

    const goToFullPage = () => { onClose(); navigate('/admin/master-data'); };

    // Get service functions for each master type
    const getUpdateService = (type) => {
        const serviceMap = {
            zones: mastersService.updateZone,
            circles: mastersService.updateCircle,
            divisions: mastersService.updateDivision,
            subdivisions: mastersService.updateSubDivision,
            districts: mastersService.updateDistrict,
            towns: mastersService.updateTown,
            schemeTypes: mastersService.updateSchemeType,
            schemes: mastersService.updateScheme,
            workTypes: mastersService.updateWorkType,
            projectCategories: mastersService.updateProjectCategory,
            contractors: mastersService.updateContractor,
            etpCharges: mastersService.updateETPCharge,
        };
        return serviceMap[type];
    };

    // Handle toggle click - show confirmation
    const handleToggleClick = (item, type, currentStatus) => {
        const isActive = currentStatus === 'Active' || currentStatus === 'ACTIVE' || currentStatus === true;
        const newStatus = isActive ? 'Inactive' : 'Active';
        setConfirmModal({ open: true, item: { ...item }, type, newStatus });
    };

    // Close confirmation modal safely
    const closeConfirmModal = () => {
        if (!updating) {
            setConfirmModal({ open: false, item: null, type: null, newStatus: null });
        }
    };

    // Confirm status change - with proper state management to prevent crashes
    const confirmStatusChange = async () => {
        const { item, type, newStatus } = confirmModal;
        if (!item || !type) return;

        setUpdating(true);
        try {
            const updateFn = getUpdateService(type);
            if (!updateFn) throw new Error('Update function not found');

            let payload = { status: newStatus };

            // Handle special cases
            if (type === 'etpCharges') {
                payload = { is_active: newStatus === 'Active' };
            } else if (type === 'contractors') {
                payload = { blacklisted: newStatus !== 'Active' };
            }

            await updateFn(item.id, payload);

            // Close modal FIRST before updating data
            setConfirmModal({ open: false, item: null, type: null, newStatus: null });
            setUpdating(false);

            // Show success and refresh data AFTER modal is closed
            toast.success(`${item.name || item.code} is now ${newStatus}`);

            // Delay the data refresh to let the modal animation complete
            setTimeout(() => {
                if (isSearchMode) {
                    fetchAllData();
                } else {
                    fetchTabData(activeTab);
                }
            }, 100);

        } catch (error) {
            console.error('Status update failed:', error);
            toast.error(error.response?.data?.detail || 'Failed to update status');
            setUpdating(false);
        }
    };

    // Get item status helper
    const getItemStatus = (item, type) => {
        if (type === 'etpCharges') return item.is_active !== false;
        if (type === 'contractors') return !item.blacklisted;
        return item.status === 'Active' || item.status === 'ACTIVE' || item.status === undefined;
    };

    // Filter items by search query
    const filterItems = (items) => {
        if (!searchQuery.trim()) return items;
        const query = searchQuery.toLowerCase();
        return items.filter(item =>
            (item.name || '').toLowerCase().includes(query) ||
            (item.code || '').toLowerCase().includes(query)
        );
    };

    // Check if any items match search in a category
    const hasSearchResults = (items) => filterItems(items).length > 0;

    // Column component for master data with color support
    const MasterColumn = ({ title, items, type, icon: Icon, colorClass }) => {
        const filtered = filterItems(items);
        if (isSearchMode && filtered.length === 0) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-[180px]"
            >
                <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border ${colorClass || 'bg-slate-100 border-slate-200'}`}>
                    {Icon && <Icon size={14} className="text-slate-600" />}
                    <span className="text-sm font-semibold text-slate-700">{title}</span>
                    <span className="text-xs text-slate-500 bg-white/80 px-1.5 py-0.5 rounded-full">{filtered.length}</span>
                </div>
                <div className="border border-t-0 border-slate-200 dark:border-neutral-700 rounded-b-lg bg-white dark:bg-neutral-900 max-h-64 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-slate-400 dark:text-neutral-500">No entries</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map((item, idx) => {
                                const isActive = getItemStatus(item, type);
                                return (
                                    <div key={item.id || idx} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
                                        <span className={`text-sm ${isActive ? 'text-slate-700 dark:text-neutral-300' : 'text-slate-400 dark:text-neutral-600 line-through'}`}>
                                            {item.name || item.code}
                                        </span>
                                        <Toggle
                                            size="sm"
                                            checked={isActive}
                                            onChange={() => handleToggleClick(item, type, isActive ? 'Active' : 'Inactive')}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    // Search results view showing all matching results across all master types
    const SearchResultsView = () => {
        const hierarchyResults = hasSearchResults(data.zones) || hasSearchResults(data.circles) ||
            hasSearchResults(data.divisions) || hasSearchResults(data.subdivisions);
        const geographyResults = hasSearchResults(data.districts) || hasSearchResults(data.towns);
        const classificationResults = hasSearchResults(data.schemeTypes) || hasSearchResults(data.schemes) ||
            hasSearchResults(data.workTypes) || hasSearchResults(data.projectCategories);
        const contractorResults = hasSearchResults(data.contractors);
        const etpResults = hasSearchResults(data.etpCharges);

        const hasAnyResults = hierarchyResults || geographyResults || classificationResults || contractorResults || etpResults;

        if (!hasAnyResults) {
            return (
                <div className="py-12 text-center">
                    <Search size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No results found for "{searchQuery}"</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Hierarchy Results */}
                {hierarchyResults && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 size={16} className="text-emerald-600" />
                            <span className="font-semibold text-slate-700 dark:text-white">Hierarchy</span>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <MasterColumn title="Zones" items={data.zones} type="zones" icon={Building2} colorClass={TAB_COLORS.hierarchy.header} />
                            <MasterColumn title="Circles" items={data.circles} type="circles" icon={Building2} colorClass={TAB_COLORS.hierarchy.header} />
                            <MasterColumn title="Divisions" items={data.divisions} type="divisions" icon={Building2} colorClass={TAB_COLORS.hierarchy.header} />
                            <MasterColumn title="Sub-Divisions" items={data.subdivisions} type="subdivisions" icon={Building2} colorClass={TAB_COLORS.hierarchy.header} />
                        </div>
                    </div>
                )}

                {/* Geography Results */}
                {geographyResults && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <MapPin size={16} className="text-blue-600" />
                            <span className="font-semibold text-slate-700 dark:text-white">Geography</span>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <MasterColumn title="Districts" items={data.districts} type="districts" icon={MapPin} colorClass={TAB_COLORS.geography.header} />
                            <MasterColumn title="Towns" items={data.towns} type="towns" icon={MapPin} colorClass={TAB_COLORS.geography.header} />
                        </div>
                    </div>
                )}

                {/* Classification Results */}
                {classificationResults && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={16} className="text-purple-600" />
                            <span className="font-semibold text-slate-700 dark:text-white">Classification</span>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <MasterColumn title="Scheme Types" items={data.schemeTypes} type="schemeTypes" icon={FileText} colorClass={TAB_COLORS.classification.header} />
                            <MasterColumn title="Schemes" items={data.schemes} type="schemes" icon={FileText} colorClass={TAB_COLORS.classification.header} />
                            <MasterColumn title="Work Types" items={data.workTypes} type="workTypes" icon={FileText} colorClass={TAB_COLORS.classification.header} />
                            <MasterColumn title="Categories" items={data.projectCategories} type="projectCategories" icon={FileText} colorClass={TAB_COLORS.classification.header} />
                        </div>
                    </div>
                )}

                {/* Contractor Results */}
                {contractorResults && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Users size={16} className="text-amber-600" />
                            <span className="font-semibold text-slate-700 dark:text-neutral-200">Contractors</span>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <MasterColumn title="Contractors" items={data.contractors} type="contractors" icon={Users} colorClass={TAB_COLORS.entities.header} />
                        </div>
                    </div>
                )}

                {/* ETP Results */}
                {etpResults && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Calculator size={16} className="text-rose-600" />
                            <span className="font-semibold text-slate-700 dark:text-neutral-200">ETP Charges</span>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <MasterColumn title="ETP Charges" items={data.etpCharges} type="etpCharges" icon={Calculator} colorClass={TAB_COLORS.etp.header} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <SectionHeader title="Master Data" description="View and toggle status of reference data" />
                <Button
                    onClick={goToFullPage}
                    className="bg-primary-950 hover:bg-primary-900 min-h-[36px]"
                    size="sm"
                >
                    <Database size={16} /> Open Master Data Page
                </Button>
            </div>

            {/* All 5 Tabs with unique colors */}
            <div className="flex flex-wrap gap-2 mb-4">
                {MASTER_TABS.map(tab => {
                    const colors = TAB_COLORS[tab.id];
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSearchQuery('');
                                setIsSearchMode(false);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id && !isSearchMode
                                ? `${colors.bg} text-white shadow-lg`
                                : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
                                }`}
                        >
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search across all master data..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-neutral-900 dark:text-white border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={() => { setSearchQuery(''); setIsSearchMode(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                    >
                        <X size={14} className="text-slate-400" />
                    </button>
                )}
            </div>

            {/* Tab Content with Animation */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-neutral-700 p-4">
                {loading ? <LoadingSpinner /> : (
                    <AnimatePresence mode="wait">
                        {isSearchMode ? (
                            <motion.div
                                key="search-results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <SearchResultsView />
                            </motion.div>
                        ) : (
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-x-auto"
                            >
                                {activeTab === 'hierarchy' && (
                                    <div className="flex gap-4">
                                        <MasterColumn title="Zones" items={data.zones} type="zones" icon={Building2} colorClass={TAB_COLORS.hierarchy.header} />
                                        <MasterColumn title="Circles" items={data.circles} type="circles" icon={Building2} colorClass={TAB_COLORS.hierarchy.header} />
                                        <MasterColumn title="Divisions" items={data.divisions} type="divisions" icon={Building2} colorClass={TAB_COLORS.hierarchy.header} />
                                        <MasterColumn title="Sub-Divisions" items={data.subdivisions} type="subdivisions" icon={Building2} colorClass={TAB_COLORS.hierarchy.header} />
                                    </div>
                                )}

                                {activeTab === 'geography' && (
                                    <div className="flex gap-4">
                                        <MasterColumn title="Districts" items={data.districts} type="districts" icon={MapPin} colorClass={TAB_COLORS.geography.header} />
                                        <MasterColumn title="Towns/Cities" items={data.towns} type="towns" icon={MapPin} colorClass={TAB_COLORS.geography.header} />
                                    </div>
                                )}

                                {activeTab === 'classification' && (
                                    <div className="flex gap-4">
                                        <MasterColumn title="Scheme Types" items={data.schemeTypes} type="schemeTypes" icon={FileText} colorClass={TAB_COLORS.classification.header} />
                                        <MasterColumn title="Schemes" items={data.schemes} type="schemes" icon={FileText} colorClass={TAB_COLORS.classification.header} />
                                        <MasterColumn title="Work Types" items={data.workTypes} type="workTypes" icon={FileText} colorClass={TAB_COLORS.classification.header} />
                                        <MasterColumn title="Categories" items={data.projectCategories} type="projectCategories" icon={FileText} colorClass={TAB_COLORS.classification.header} />
                                    </div>
                                )}

                                {activeTab === 'entities' && (
                                    <div className="flex gap-4">
                                        <MasterColumn title="Contractors" items={data.contractors} type="contractors" icon={Users} colorClass={TAB_COLORS.entities.header} />
                                    </div>
                                )}

                                {activeTab === 'etp' && (
                                    <div className="flex gap-4">
                                        <MasterColumn title="ETP Charges" items={data.etpCharges} type="etpCharges" icon={Calculator} colorClass={TAB_COLORS.etp.header} />
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Confirmation Modal - Rendered via Portal to prevent DOM issues */}
            {confirmModal.open && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
                        onClick={closeConfirmModal}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 text-center">
                                <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${confirmModal.newStatus === 'Active' ? 'bg-emerald-100' : 'bg-amber-100'
                                    }`}>
                                    {confirmModal.newStatus === 'Active' ? (
                                        <Check size={28} className="text-emerald-600" />
                                    ) : (
                                        <XCircle size={28} className="text-amber-600" />
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">
                                    Confirm Status Change
                                </h3>
                                <p className="text-sm text-slate-600 mb-1">
                                    Are you sure you want to set
                                </p>
                                <p className="text-base font-semibold text-slate-900 mb-1">
                                    "{confirmModal.item?.name || confirmModal.item?.code}"
                                </p>
                                <p className="text-sm text-slate-600">
                                    to <span className={`font-semibold ${confirmModal.newStatus === 'Active' ? 'text-emerald-600' : 'text-amber-600'
                                        }`}>{confirmModal.newStatus}</span>?
                                </p>
                                <p className="text-xs text-slate-400 mt-3">
                                    This change will sync across the entire website.
                                </p>
                            </div>
                            <div className="flex border-t border-slate-200">
                                <button
                                    onClick={closeConfirmModal}
                                    disabled={updating}
                                    className="flex-1 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmStatusChange}
                                    disabled={updating}
                                    className={`flex-1 px-4 py-3 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 ${confirmModal.newStatus === 'Active'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-amber-600 hover:bg-amber-700'
                                        } disabled:opacity-50`}
                                >
                                    {updating ? (
                                        <><RefreshCw size={14} className="animate-spin" /> Updating...</>
                                    ) : (
                                        <>Confirm</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

// ============ WORKFLOW CONFIG SECTION ============
const WorkflowConfigSection = () => {
    const [workflows, setWorkflows] = useState([
        { id: 'wf-1', name: 'RFQ Approval', type: 'RFQ', steps: [{ step: 1, role: 'EPC_Contractor', action: 'Submit' }, { step: 2, role: 'PMNC_Team', action: 'Review' }, { step: 3, role: 'SPV_Official', action: 'Approve' }] },
        { id: 'wf-2', name: 'Bill Approval', type: 'Bill', steps: [{ step: 1, role: 'EPC_Contractor', action: 'Submit' }, { step: 2, role: 'PMNC_Team', action: 'Verify' }, { step: 3, role: 'SPV_Official', action: 'Approve' }] },
    ]);
    const [selectedWf, setSelectedWf] = useState(workflows[0]);

    const handleAddStep = () => { if (!selectedWf) return; const newStep = { step: selectedWf.steps.length + 1, role: 'PMNC_Team', action: 'Review' }; setSelectedWf({ ...selectedWf, steps: [...selectedWf.steps, newStep] }); };
    const handleDeleteStep = (idx) => { const steps = selectedWf.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })); setSelectedWf({ ...selectedWf, steps }); };
    const handleUpdateStep = (idx, field, val) => { const steps = [...selectedWf.steps]; steps[idx] = { ...steps[idx], [field]: val }; setSelectedWf({ ...selectedWf, steps }); };
    const handleSave = () => { setWorkflows(prev => prev.map(w => w.id === selectedWf.id ? selectedWf : w)); toast.success('Workflow saved'); };

    return (
        <div>
            <SectionHeader title="Workflow Configuration" description="Define approval workflows" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SettingsCard>
                    <h4 className="font-semibold mb-4">Workflows</h4>
                    <div className="space-y-2">
                        {workflows.map(wf => (
                            <button key={wf.id} onClick={() => setSelectedWf(wf)}
                                className={`w-full text-left p-3 rounded-lg border ${selectedWf?.id === wf.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800'}`}>
                                <p className="font-semibold text-sm dark:text-white">{wf.name}</p>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">{wf.type} • {wf.steps.length} steps</p>
                            </button>
                        ))}
                    </div>
                </SettingsCard>
                <div className="lg:col-span-2">
                    <SettingsCard>
                        {selectedWf ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold dark:text-white">{selectedWf.name}</h4>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddStep} className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-neutral-800 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-700 flex items-center gap-1"><Plus size={14} /> Add Step</button>
                                        <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1"><Save size={14} /> Save</button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {selectedWf.steps.map((step, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-neutral-800 rounded-lg border dark:border-neutral-700">
                                            <GripVertical size={16} className="text-slate-400" />
                                            <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{step.step}</span>
                                            <select value={step.role} onChange={(e) => handleUpdateStep(idx, 'role', e.target.value)} className="px-3 py-1.5 border dark:border-neutral-600 dark:bg-neutral-900 dark:text-white rounded-lg text-sm">
                                                {USER_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                                            </select>
                                            <select value={step.action} onChange={(e) => handleUpdateStep(idx, 'action', e.target.value)} className="px-3 py-1.5 border dark:border-neutral-600 dark:bg-neutral-900 dark:text-white rounded-lg text-sm">
                                                {WORKFLOW_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                                            </select>
                                            <button onClick={() => handleDeleteStep(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : <div className="py-12 text-center text-slate-500">Select a workflow</div>}
                    </SettingsCard>
                </div>
            </div>
        </div>
    );
};

// ============ INTEGRATIONS SECTION ============
const IntegrationsSection = ({ settings, updateSetting }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div>
            <SectionHeader title="Integrations" description="Connect external services and APIs" />
            <SettingsCard>
                <SettingsRow icon={Mail} title="Email Notifications" description="Enable email notifications for events">
                    <Toggle checked={settings.emailNotifications || false} onChange={(c) => updateSetting('emailNotifications', c)} />
                </SettingsRow>
                <SettingsRow icon={MessageSquare} title="SMS Alerts" description="Send SMS for critical updates">
                    <Toggle checked={settings.smsAlerts || false} onChange={(c) => updateSetting('smsAlerts', c)} />
                </SettingsRow>
            </SettingsCard>
            <SettingsCard className="mt-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold dark:text-white">External Systems</h4>
                        <div className="relative">
                            <button
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                            >
                                <Info size={16} />
                            </button>
                            {showTooltip && (
                                <div className="absolute left-0 top-8 z-50 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl">
                                    <p className="font-medium mb-1">How PMIS connects:</p>
                                    <p>Integrations are established through backend API endpoints. NICDC Dashboard receives project progress data. GIS Service provides spatial mapping. Finance MIS syncs fund flows. API keys are configured in backend settings.</p>
                                    <div className="absolute -top-1 left-3 w-2 h-2 bg-slate-800 transform rotate-45"></div>
                                </div>
                            )}
                        </div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-neutral-400">Requires API keys</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm">
                        <p className="font-medium text-slate-800 dark:text-white">NICDC Dashboard</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">Sends project progress data</p>
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">○ Pending Setup</span>
                    </div>
                    <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm">
                        <p className="font-medium text-slate-800 dark:text-white">GIS Service</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">Spatial data & mapping</p>
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">○ Pending Setup</span>
                    </div>
                    <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm">
                        <p className="font-medium text-slate-800 dark:text-white">Finance MIS</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">Fund flow & billing sync</p>
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">○ Pending Setup</span>
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
};

// ============ NOTIFICATIONS SECTION ============
const NotificationsSection = ({ settings, updateSetting }) => (
    <div>
        <SectionHeader title="Notifications" description="Manage notification preferences" />
        <SettingsCard>
            <SettingsRow icon={Bell} title="Push Notifications" description="Browser push notifications">
                <Toggle checked={settings.pushNotifications || false} onChange={(c) => updateSetting('pushNotifications', c)} />
            </SettingsRow>
            <SettingsRow icon={Mail} title="Email Digest" description="Daily email summary">
                <Toggle checked={settings.emailDigest || false} onChange={(c) => updateSetting('emailDigest', c)} />
            </SettingsRow>
            <SettingsRow icon={Clock} title="Deadline Reminders" description="7 days before deadline">
                <Toggle checked={settings.deadlineReminders || true} onChange={(c) => updateSetting('deadlineReminders', c)} />
            </SettingsRow>
        </SettingsCard>
    </div>
);

// ============ SYSTEM SECTION ============
const SystemSection = ({ settings, updateSetting }) => (
    <div>
        <SectionHeader title="System Settings" description="Configure system preferences" />
        <SettingsCard>
            <SettingsRow icon={Globe} title="Language" description="Default language">
                <select value={settings.language || 'en'} onChange={(e) => updateSetting('language', e.target.value)} className="px-3 py-2 border dark:border-neutral-600 bg-white dark:bg-neutral-900 dark:text-white rounded-lg text-sm">
                    <option value="en">English</option><option value="hi">Hindi</option><option value="te">Telugu</option>
                </select>
            </SettingsRow>
            <SettingsRow icon={Moon} title="Dark Mode" description="Enable dark theme">
                <Toggle checked={settings.darkMode || false} onChange={(c) => updateSetting('darkMode', c)} />
            </SettingsRow>
        </SettingsCard>
        <SettingsCard className="mt-4">
            <h4 className="font-semibold mb-4 dark:text-white">System Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500 dark:text-neutral-400">Version</span><p className="font-medium dark:text-white">2.0.1</p></div>
                <div><span className="text-slate-500 dark:text-neutral-400">Environment</span><p className="font-medium dark:text-white">Production</p></div>
                <div><span className="text-slate-500 dark:text-neutral-400">Database</span><p className="font-medium text-emerald-600">Connected</p></div>
                <div><span className="text-slate-500 dark:text-neutral-400">Last Backup</span><p className="font-medium dark:text-white">{new Date().toLocaleDateString()}</p></div>
            </div>
        </SettingsCard>
    </div>
);

// ============ SECURITY SECTION ============
const SecuritySection = ({ settings, updateSetting }) => (
    <div>
        <SectionHeader title="Security Settings" description="Manage security and privacy" />
        <SettingsCard>
            <SettingsRow icon={Shield} title="Two-Factor Auth" description="Extra security layer">
                <Toggle checked={settings.twoFactorAuth || false} onChange={(c) => updateSetting('twoFactorAuth', c)} />
            </SettingsRow>
            <SettingsRow icon={Clock} title="Session Timeout" description="Minutes before auto logout">
                <input type="number" value={settings.sessionTimeout || 30} onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))} className="px-3 py-2 border dark:border-neutral-600 bg-white dark:bg-neutral-900 dark:text-white rounded-lg text-sm w-20" min="5" max="120" />
            </SettingsRow>
        </SettingsCard>
    </div>
);

// ============ AUDIT LOGS SECTION ============
const AuditLogsSection = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get('/audit/logs/');
            const data = res.data.results || res.data || [];
            setLogs(data.slice(0, 20).map(l => ({
                id: l.id, timestamp: l.timestamp, action: l.action,
                user: l.actor_name || 'System', resource: l.resource_type, details: l.details?.title || ''
            })));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const getActionColor = (a) => {
        const u = (a || '').toUpperCase();
        if (u.includes('CREATE') || u.includes('UPLOAD')) return 'bg-emerald-100 text-emerald-700';
        if (u.includes('DELETE')) return 'bg-red-100 text-red-700';
        if (u.includes('UPDATE')) return 'bg-blue-100 text-blue-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <div>
            <SectionHeader title="Audit Logs" description="View system activity logs" />
            <SettingsCard>
                {loading ? <LoadingSpinner /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b"><th className="text-left py-2 px-3">Time</th><th className="text-left py-2 px-3">User</th><th className="text-left py-2 px-3">Action</th><th className="text-left py-2 px-3">Resource</th></tr></thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id} className="border-b border-slate-100 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800">
                                        <td className="py-2 px-3 text-slate-500 dark:text-neutral-400">{new Date(l.timestamp).toLocaleString()}</td>
                                        <td className="py-2 px-3 font-medium dark:text-white">{l.user}</td>
                                        <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(l.action)}`}>{l.action}</span></td>
                                        <td className="py-2 px-3">{l.resource}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SettingsCard>
        </div>
    );
};

export default SettingsModal;
