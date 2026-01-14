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

      // Extract error message from various possible locations
      let errorMessage = 'Invalid credentials';

      if (error.response?.data) {
        // Backend returns { detail: "message", code: "code" }
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.non_field_errors) {
          errorMessage = error.response.data.non_field_errors[0];
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      return { success: false, error: errorMessage };
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
        'projects:view',
        'projects:manage',
        'approvals:view',
        'approvals:manage',
        'users:view',
        'users:manage',
        'masters:view',
        'masters:manage',
        'scheduling:view',
        'scheduling:manage',
        'cost:view',
        'cost:manage',
        'billing:view',
        'billing:manage',
        'risk:view',
        'risk:manage',
        'gis:view',
        'bim:view',
        'reports:view',
        'reports:create',
        'edms:view',
        'edms:upload',
        'edms:approve',
        'communications:view',
        'communications:send',
        'audit:view'
      ],
      'NICDC_HQ': [
        'dashboard:view',
        'projects:view',
        'projects:manage',
        'approvals:view',
        'approvals:manage',
        'users:view',
        'users:manage',
        'masters:view',
        'masters:manage',
        'scheduling:view',
        'cost:view',
        'cost:manage',
        'billing:view',
        'risk:view',
        'gis:view',
        'bim:view',
        'reports:view',
        'edms:view',
        'edms:approve',
        'communications:view',
        'communications:send',
        'audit:view'
      ],
      'PMNC_Team': [
        'dashboard:view',
        'projects:view',
        'projects:edit',
        'scheduling:view',
        'scheduling:manage',
        'cost:view',
        'billing:view',
        'risk:view',
        'risk:manage',
        'reports:view',
        'reports:create',
        'edms:view',
        'edms:upload',
        'communications:view',
        'communications:send'
      ],
      'EPC_Contractor': [
        'dashboard:view',
        'projects:view',
        'tasks:update',
        'billing:view',
        'billing:submit',
        'edms:view',
        'edms:upload',
        'communications:view',
        'communications:send'
      ],
      'Consultant_Design': [
        'dashboard:view',
        'projects:view',
        'scheduling:view',
        'cost:view',
        'bim:view',
        'edms:view',
        'edms:upload',
        'communications:view',
        'communications:send'
      ],
      'Govt_Department': [
        'dashboard:view',
        'projects:view',
        'reports:view',
        'gis:view',
        'edms:view',
        'communications:view'
      ]
    };
    return rolePermissions[role] || ['dashboard:view'];
  };

  const hasPermission = (permission) => {
    return user?.permissions?.includes(permission) || false;
  };

  // Helper to check if user is admin
  const isAdmin = () => {
    return user?.role === 'SPV_Official' || user?.role === 'NICDC_HQ';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      logout,
      hasPermission,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
