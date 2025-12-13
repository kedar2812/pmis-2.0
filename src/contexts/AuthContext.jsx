import { createContext, useContext, useState, useEffect } from 'react';
import client from '@/api/client';
import { toast } from 'sonner';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initial load check
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Validate token and get user profile
          const response = await client.get('/users/me/');
          const userData = response.data;

          const finalUser = {
            ...userData,
            name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
            avatar: `https://ui-avatars.com/api/?name=${userData.username}&background=random`,
            permissions: getPermissionsForRole(userData.role)
          };
          setUser(finalUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      // 1. Get Tokens
      const loginResponse = await client.post('/auth/login/', {
        username: username,
        password: password
      });

      const { access, refresh } = loginResponse.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      // Validate token and get user profile
      const response = await client.get('/users/me/');
      const userData = response.data;

      const finalUser = {
        ...userData,
        name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
        avatar: `https://ui-avatars.com/api/?name=${userData.username}&background=random`,
        permissions: getPermissionsForRole(userData.role)
      };

      setUser(finalUser);
      setIsAuthenticated(true);
      toast.success('Login successful');
      return { success: true };

    } catch (error) {
      console.error('Login error:', error);
      const msg = error.response?.data?.detail || 'Invalid credentials';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
    toast.info('Logged out successfully');
  };

  // Helper to map backend roles to frontend permissions
  const getPermissionsForRole = (role) => {
    const rolePermissions = {
      'SPV_Official': [
        'dashboard:view',
        'projects:manage',
        'approvals:manage',
        'users:manage',

        'scheduling:view',
        'cost:view',
        'risk:view',
        'gis:view',
        'bim:view',
        'reports:view',
        'edms:view',
        'edms:upload'
      ],
      'PMNC_Team': ['dashboard:view', 'projects:edit', 'reports:create', 'scheduling:view', 'risk:view', 'edms:view'],
      'EPC_Contractor': ['dashboard:view', 'projects:view', 'tasks:update', 'edms:view', 'edms:upload'],
      'Nodal_Officer': ['dashboard:view', 'approvals:manage', 'reports:view', 'edms:view'],
      'Govt_Official': ['dashboard:view', 'reports:view', 'gis:view', 'edms:view']
    };
    return rolePermissions[role] || [];
  };

  const hasPermission = (permission) => {
    return user?.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};
