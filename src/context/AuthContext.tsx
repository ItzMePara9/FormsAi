import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSetupRequired: boolean;
  appName: string;
  settings: Record<string, string>;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setAppName: (name: string) => void;
  setIsSetupRequired: (required: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [appName, setAppName] = useState('FormGenius AI');
  const [settings, setSettings] = useState<Record<string, string>>({});

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const setupRes = await fetch('/api/auth/setup-status');
      if (setupRes.ok) {
        const setupData = await setupRes.json();
        setIsSetupRequired(setupData.isSetupRequired);
        if (setupData.appName) {
          setAppName(setupData.appName);
        }

        if (setupData.isSetupRequired) {
          setUser(null);
          setIsLoading(false);
          return;
        }
      }

      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
        if (meData.settings) {
          setSettings(meData.settings);
          if (meData.settings.appName) {
            setAppName(meData.settings.appName);
          }
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth verification error:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSetupRequired,
        appName,
        settings,
        checkAuth,
        logout,
        setUser,
        setAppName,
        setIsSetupRequired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
