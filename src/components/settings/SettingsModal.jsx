import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    X, Settings, Users, Database, GitBranch, Plug, Bell,
    Shield, ChevronRight, Search, User, KeyRound, Clock,
    Building2, CreditCard, FileText, Percent, Map, Calendar,
    Mail, MessageSquare, Smartphone, Info, Download, Upload,
    Globe, Palette, Moon, Sun, HardDrive, AlertTriangle,
    Plus, Edit2, Trash2, Check, XCircle, RefreshCw, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import Toggle from '@/components/ui/Toggle';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/api/services/userService';
import mastersService from '@/api/services/mastersService';
import settingsService from '@/api/services/settingsService';

/**
 * Settings Modal Component
 * Comprehensive settings management with all sections
 */
const SettingsModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('users');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Settings state - loaded from localStorage/backend
    const [settings, setSettings] = useState(settingsService.getDefaultSettings());

    // Load settings on mount
    useEffect(() => {
        const saved = settingsService.getSettings();
        if (saved) {
            setSettings(prev => ({ ...prev, ...saved }));
        }
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

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
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
    ];

    const filteredSections = sections.filter(s =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-4 md:inset-10 lg:inset-16 z-[101] flex"
                    >
                        <div className="
                            w-full h-full
                            bg-white/90 backdrop-blur-xl
                            rounded-3xl
                            border border-white/30
                            shadow-[0_32px_64px_rgba(0,0,0,0.2)]
                            overflow-hidden
                            flex flex-col
                        ">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                                        <Settings className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Settings</h2>
                                        <p className="text-xs text-slate-400">Manage your PMIS configuration</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {saveMessage && (
                                        <motion.span
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="text-sm text-emerald-600 font-medium flex items-center gap-1"
                                        >
                                            <Check size={14} /> {saveMessage}
                                        </motion.span>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        <X size={20} className="text-slate-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Sidebar */}
                                <div className="w-64 border-r border-slate-200/50 flex flex-col bg-slate-50/50">
                                    {/* Search */}
                                    <div className="p-4">
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search settings..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    {/* Navigation */}
                                    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                                        {filteredSections.map((section) => (
                                            <button
                                                key={section.id}
                                                onClick={() => setActiveSection(section.id)}
                                                className={`
                                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                                    transition-all duration-200
                                                    ${activeSection === section.id
                                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                        : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                                    }
                                                `}
                                            >
                                                <section.icon size={18} />
                                                <span className="text-sm font-medium">{section.label}</span>
                                                <ChevronRight size={14} className="ml-auto opacity-50" />
                                            </button>
                                        ))}
                                    </nav>

                                    {/* User Info */}
                                    <div className="p-4 border-t border-slate-200/50">
                                        <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-sm font-medium">
                                                    {user?.first_name?.[0] || user?.name?.[0] || 'A'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">
                                                    {user?.first_name || user?.name || 'Admin'}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">
                                                    {user?.role || 'Super Admin'}
                                                </p>
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
                                            transition={{ duration: 0.2 }}
                                        >
                                            {activeSection === 'users' && (
                                                <UserManagementSection navigate={navigate} onClose={onClose} />
                                            )}
                                            {activeSection === 'roles' && (
                                                <RolesPermissionsSection navigate={navigate} onClose={onClose} />
                                            )}
                                            {activeSection === 'masters' && (
                                                <MasterDataSection navigate={navigate} onClose={onClose} />
                                            )}
                                            {activeSection === 'workflow' && (
                                                <WorkflowConfigSection navigate={navigate} onClose={onClose} />
                                            )}
                                            {activeSection === 'integrations' && (
                                                <IntegrationsSection
                                                    settings={settings}
                                                    updateSetting={updateSetting}
                                                />
                                            )}
                                            {activeSection === 'notifications' && (
                                                <NotificationsSection
                                                    settings={settings}
                                                    updateSetting={updateSetting}
                                                />
                                            )}
                                            {activeSection === 'system' && (
                                                <SystemSection
                                                    settings={settings}
                                                    updateSetting={updateSetting}
                                                />
                                            )}
                                            {activeSection === 'security' && (
                                                <SecuritySection
                                                    settings={settings}
                                                    updateSetting={updateSetting}
                                                    navigate={navigate}
                                                    onClose={onClose}
                                                />
                                            )}
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

// ============ Helper Components ============
const SectionHeader = ({ title, description }) => (
    <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
);

const SettingsCard = ({ children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}>
        {children}
    </div>
);

const SettingsRow = ({ icon: Icon, title, description, children }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
        <div className="flex items-center gap-4">
            {Icon && (
                <div className="p-2 bg-slate-100 rounded-lg">
                    <Icon size={18} className="text-slate-600" />
                </div>
            )}
            <div>
                <p className="text-sm font-medium text-slate-700">{title}</p>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
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

// ============ User Details Popup ============
const UserDetailsPopup = ({ user, onClose, onToggleStatus }) => {
    const [isToggling, setIsToggling] = useState(false);

    const roleLabels = {
        'SPV_Official': 'SPV Official',
        'NICDC_HQ': 'NICDC Headquarters',
        'PMNC_Team': 'PMNC Team',
        'EPC_Contractor': 'EPC Contractor',
        'Consultant_Design': 'Design Consultant',
        'Govt_Department': 'Government Department',
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const handleToggle = async () => {
        setIsToggling(true);
        try {
            await onToggleStatus();
            setTimeout(() => onClose(), 500);
        } catch (error) {
            console.error('Toggle error:', error);
            setIsToggling(false);
        }
    };

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Full screen backdrop blur */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

            {/* Popup - Glassmorphism */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/30"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X size={18} className="text-slate-600" />
                </button>

                {/* User Info */}
                <div className="p-4 text-center border-b border-slate-200/50">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-xl font-bold text-white">
                            {(user.first_name || user.email || 'U')[0].toUpperCase()}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                        {user.first_name} {user.last_name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{user.email}</p>
                    <div className="mt-2">
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${user.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {user.is_active ? '● Active' : '○ Inactive'}
                        </span>
                    </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Role</p>
                            <p className="text-sm font-medium text-slate-800 mt-0.5">
                                {roleLabels[user.role] || user.role || 'Unknown'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Department</p>
                            <p className="text-sm font-medium text-slate-800 mt-0.5">
                                {user.department || 'Not specified'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Phone</p>
                            <p className="text-sm font-medium text-slate-800 mt-0.5">
                                {user.phone_number || 'Not provided'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Designation</p>
                            <p className="text-sm font-medium text-slate-800 mt-0.5">
                                {user.designation || 'Not specified'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Joined</p>
                            <p className="text-xs font-medium text-slate-800 mt-0.5">
                                {formatDate(user.date_joined)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Last Login</p>
                            <p className="text-xs font-medium text-slate-800 mt-0.5">
                                {formatDate(user.last_login)}
                            </p>
                        </div>
                    </div>

                    {user.company_name && (
                        <div className="pt-3 border-t border-slate-200/50">
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Company</p>
                            <p className="text-sm font-medium text-slate-800 mt-0.5">{user.company_name}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50/80 backdrop-blur-sm flex gap-2 border-t border-slate-200/50">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleToggle}
                        disabled={isToggling}
                        className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${user.is_active
                            ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300'
                            }`}
                    >
                        {isToggling ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : user.is_active ? (
                            <>
                                <XCircle size={16} />
                                Deactivate
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                Activate
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

// ============ User Management Section ============
const UserManagementSection = ({ navigate, onClose }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers();
            setUsers(Array.isArray(data) ? data : data?.results || []);
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId) => {
        try {
            await userService.toggleUserStatus(userId);
            await loadUsers();
            if (selectedUser && selectedUser.id === userId) {
                const updated = await userService.getUserById(userId);
                setSelectedUser(updated);
            }
            toast.success('User status updated');
        } catch (error) {
            console.error('Failed to toggle status:', error);
            toast.error('Failed to update user status');
        }
    };

    const handleViewUser = (user) => {
        setSelectedUser(user);
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div>
            <SectionHeader
                title="User Management"
                description="Manage user accounts and access permissions"
            />

            <SettingsCard>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-slate-700">Active Users</h4>
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
                        <Plus size={16} />
                        Add User
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">User</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Role</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs font-medium">
                                                    {(user.first_name || user.email || 'U')[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">
                                                    {user.first_name} {user.last_name}
                                                </p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-sm text-slate-600">{user.role}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleViewUser(user)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user.id)}
                                                className={`p-1.5 rounded-lg transition-colors ${user.is_active
                                                    ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                    }`}
                                                title={user.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {user.is_active ? <XCircle size={16} /> : <Check size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SettingsCard>

            {/* User Details Popup */}
            <AnimatePresence>
                {selectedUser && (
                    <UserDetailsPopup
                        user={selectedUser}
                        onClose={() => setSelectedUser(null)}
                        onToggleStatus={() => handleToggleStatus(selectedUser.id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ============ Roles & Permissions Section ============
const RolesPermissionsSection = () => (
    <div>
        <SectionHeader
            title="Roles & Permissions"
            description="Configure user roles and access control"
        />
        <SettingsCard>
            <p className="text-sm text-slate-500">Roles and permissions configuration coming soon...</p>
        </SettingsCard>
    </div>
);

// ============ Master Data Section ============
const MasterDataSection = () => (
    <div>
        <SectionHeader
            title="Master Data"
            description="Manage master data and classifications"
        />
        <SettingsCard>
            <p className="text-sm text-slate-500">Master data management coming soon...</p>
        </SettingsCard>
    </div>
);

// ============ Workflow Config Section ============
const WorkflowConfigSection = () => (
    <div>
        <SectionHeader
            title="Workflow Configuration"
            description="Configure approval workflows and process automation"
        />
        <SettingsCard>
            <p className="text-sm text-slate-500">Workflow configuration coming soon...</p>
        </SettingsCard>
    </div>
);

// ============ Integrations Section ============
const IntegrationsSection = ({ settings, updateSetting }) => (
    <div>
        <SectionHeader
            title="Integrations"
            description="Connect external services and APIs"
        />
        <SettingsCard>
            <SettingsRow
                icon={Mail}
                title="Email Notifications"
                description="Enable email notifications for important events"
            >
                <Toggle
                    checked={settings.emailNotifications || false}
                    onChange={(checked) => updateSetting('emailNotifications', checked)}
                />
            </SettingsRow>
            <SettingsRow
                icon={MessageSquare}
                title="SMS Alerts"
                description="Send SMS alerts for critical updates"
            >
                <Toggle
                    checked={settings.smsAlerts || false}
                    onChange={(checked) => updateSetting('smsAlerts', checked)}
                />
            </SettingsRow>
        </SettingsCard>
    </div>
);

// ============ Notifications Section ============
const NotificationsSection = ({ settings, updateSetting }) => (
    <div>
        <SectionHeader
            title="Notifications"
            description="Manage notification preferences"
        />
        <SettingsCard>
            <SettingsRow
                icon={Bell}
                title="Push Notifications"
                description="Receive push notifications in browser"
            >
                <Toggle
                    checked={settings.pushNotifications || false}
                    onChange={(checked) => updateSetting('pushNotifications', checked)}
                />
            </SettingsRow>
            <SettingsRow
                icon={Mail}
                title="Email Digest"
                description="Receive daily email summary"
            >
                <Toggle
                    checked={settings.emailDigest || false}
                    onChange={(checked) => updateSetting('emailDigest', checked)}
                />
            </SettingsRow>
        </SettingsCard>
    </div>
);

// ============ System Section ============
const SystemSection = ({ settings, updateSetting }) => (
    <div>
        <SectionHeader
            title="System Settings"
            description="Configure system preferences and defaults"
        />
        <SettingsCard>
            <SettingsRow
                icon={Globe}
                title="Language"
                description="Default system language"
            >
                <select
                    value={settings.language || 'en'}
                    onChange={(e) => updateSetting('language', e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="te">Telugu</option>
                </select>
            </SettingsRow>
            <SettingsRow
                icon={Moon}
                title="Dark Mode"
                description="Enable dark theme"
            >
                <Toggle
                    checked={settings.darkMode || false}
                    onChange={(checked) => updateSetting('darkMode', checked)}
                />
            </SettingsRow>
        </SettingsCard>
    </div>
);

// ============ Security Section ============
const SecuritySection = ({ settings, updateSetting }) => (
    <div>
        <SectionHeader
            title="Security Settings"
            description="Manage security and privacy settings"
        />
        <SettingsCard>
            <SettingsRow
                icon={Shield}
                title="Two-Factor Authentication"
                description="Add an extra layer of security"
            >
                <Toggle
                    checked={settings.twoFactorAuth || false}
                    onChange={(checked) => updateSetting('twoFactorAuth', checked)}
                />
            </SettingsRow>
            <SettingsRow
                icon={Clock}
                title="Session Timeout"
                description="Auto logout after inactivity (minutes)"
            >
                <input
                    type="number"
                    value={settings.sessionTimeout || 30}
                    onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-20"
                    min="5"
                    max="120"
                />
            </SettingsRow>
        </SettingsCard>
    </div>
);

export default SettingsModal;
