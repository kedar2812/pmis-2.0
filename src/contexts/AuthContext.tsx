import { createContext, useContext, useState, ReactNode } from 'react';
import type { User, UserRole } from '@/mock/interfaces';
import { users, rolePermissions, getAccessibleModules } from '@/mock';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  accessibleModules: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (role: UserRole) => {
    const userData = users.find((u) => u.role === role);
    if (userData) {
      setUser(userData);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
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


