'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface WorkerContextType {
  email: string | null;
  setEmail: (email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const WorkerContext = createContext<WorkerContextType | undefined>(undefined);

export function WorkerProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmailState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load email from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('workerEmail');
    if (stored) {
      setEmailState(stored);
    }
    setIsHydrated(true);
  }, []);

  const setEmail = (newEmail: string) => {
    setEmailState(newEmail);
    localStorage.setItem('workerEmail', newEmail);
  };

  const logout = () => {
    setEmailState(null);
    localStorage.removeItem('workerEmail');
  };

  return (
    <WorkerContext.Provider
      value={{
        email,
        setEmail,
        logout,
        isAuthenticated: !!email,
      }}
    >
      {children}
    </WorkerContext.Provider>
  );
}

export function useWorker() {
  const context = useContext(WorkerContext);
  if (context === undefined) {
    // Return a default context instead of throwing during build
    if (typeof window === 'undefined') {
      return {
        email: null,
        setEmail: () => {},
        logout: () => {},
        isAuthenticated: false,
      };
    }
    throw new Error('useWorker must be used within WorkerProvider');
  }
  return context;
}

