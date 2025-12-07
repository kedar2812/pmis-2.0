import { createContext, useContext, useState } from 'react';
import { users, rolePermissions, getAccessibleModules } from '@/mock';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (role) => {
    const userData = users.find((u) => u.role === role);
    if (userData) {
      setUser(userData);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    return rolePermissions[user.role].permissions.includes(permission);
  };

  const accessibleModules = user ? getAccessibleModules(user.role) : [];

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasPermission,
        accessibleModules,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

