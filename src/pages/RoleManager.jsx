import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Save, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

const allPermissions = [
  'dashboard:view',
  'dashboard:edit',

  'scheduling:view',
  'scheduling:edit',
  'cost:view',
  'cost:edit',
  'risk:view',
  'risk:edit',
  'gis:view',
  'bim:view',
  'users:manage',
  'projects:create',
  'projects:edit',
];

const RoleManager = () => {
  const { t } = useLanguage();
  const [roles, setRoles] = useState({
    Site_Inspector: {
      role: 'Site_Inspector',
      accessLevel: 'Contributor',
      permissions: ['dashboard:view', 'scheduling:view'],
      dashboardView: 'Site inspection reports, upload photos, view schedules',
    },
  });
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }

    const roleKey = newRoleName.replace(/\s+/g, '_');
    if (roles[roleKey]) {
      toast.error('Role already exists');
      return;
    }

    setRoles({
      ...roles,
      [roleKey]: {
        role: roleKey,
        accessLevel: 'Limited',
        permissions: [],
        dashboardView: 'Custom dashboard view',
      },
    });

    setSelectedRole(roleKey);
    setSelectedPermissions([]);
    setNewRoleName('');
    toast.success('Role created successfully');
  };

  const handleSelectRole = (roleKey) => {
    setSelectedRole(roleKey);
    setSelectedPermissions(roles[roleKey]?.permissions || []);
  };

  const handleTogglePermission = (permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const handleSaveRole = () => {
    if (!selectedRole) return;

    setRoles({
      ...roles,
      [selectedRole]: {
        ...roles[selectedRole],
        permissions: selectedPermissions,
      },
    });

    toast.success('Role permissions updated');
  };

  const handleDeleteRole = (roleKey) => {
    if (window.confirm(`Are you sure you want to delete role "${roleKey}"?`)) {
      const newRoles = { ...roles };
      delete newRoles[roleKey];
      setRoles(newRoles);
      if (selectedRole === roleKey) {
        setSelectedRole(null);
        setSelectedPermissions([]);
      }
      toast.success('Role deleted');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary-950">Role Manager</h1>
          <p className="text-slate-500 mt-1">Create and manage user roles with custom permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="New role name (e.g., Site Inspector)"
            className="px-4 py-2 border border-slate-300 rounded-lg"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateRole()}
          />
          <Button onClick={handleCreateRole}>
            <Plus size={18} />
            Create Role
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role List */}
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(roles).map(([roleKey, roleData]) => (
                <div
                  key={roleKey}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedRole === roleKey
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }`}
                  onClick={() => handleSelectRole(roleKey)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{roleKey.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500 mt-1">{roleData.accessLevel}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(roleKey);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permission Editor */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={20} />
                  Permissions for {selectedRole.replace(/_/g, ' ')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {allPermissions.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission)}
                          onChange={() => handleTogglePermission(permission)}
                          className="rounded"
                        />
                        <span className="text-sm">{permission}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSaveRole}>
                      <Save size={18} />
                      Save Permissions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <p>Select a role from the list to manage its permissions.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleManager;





