import React, { createContext, useContext, useState, useEffect } from 'react';
import { connectGoogleWithFirebase, disconnectGoogleFirebase } from '../lib/firebaseGoogleAuth.ts';

interface GoogleContextType {
  isConnected: boolean;
  email: string | null;
  connectedAt: string | null;
  scopes: string[];
  isLoading: boolean;
  isConnecting: boolean;
  refreshStatus: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const GoogleContext = createContext<GoogleContextType | undefined>(undefined);

export const GoogleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshStatus = async () => {
    try {
      const res = await fetch('/api/google/status');
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.isConnected);
        setEmail(data.email);
        setConnectedAt(data.connectedAt);
        setScopes(data.scopes || []);
      }
    } catch (err) {
      console.error('Failed to load Google status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const connect = async () => {
    try {
      setIsConnecting(true);
      await connectGoogleWithFirebase();
      await refreshStatus();
    } catch (err: any) {
      console.warn('Firebase popup sign-in did not complete, checking server-side redirect option:', err);
      try {
        const connectRes = await fetch('/api/google/connect');
        if (connectRes.ok) {
          const { authUrl } = await connectRes.json();
          if (authUrl) {
            window.location.href = authUrl;
            return;
          }
        }
      } catch (oauthErr) {
        // ignore
      }
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await disconnectGoogleFirebase();
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setIsConnected(false);
      setEmail(null);
      setConnectedAt(null);
      await refreshStatus();
    }
  };

  return (
    <GoogleContext.Provider
      value={{
        isConnected,
        email,
        connectedAt,
        scopes,
        isLoading,
        isConnecting,
        refreshStatus,
        connect,
        disconnect,
      }}
    >
      {children}
    </GoogleContext.Provider>
  );
};

export const useGoogle = () => {
  const context = useContext(GoogleContext);
  if (!context) {
    throw new Error('useGoogle must be used within a GoogleProvider');
  }
  return context;
};
