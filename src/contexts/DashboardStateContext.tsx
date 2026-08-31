"use client";

import React, { createContext, useContext, useState, useMemo } from 'react';

type DashboardMode = 'streaming' | 'loading' | 'quota-standby';

interface DashboardStateContextType {
  mode: DashboardMode;
  setMode: (mode: DashboardMode | ((prev: DashboardMode) => DashboardMode)) => void;
}

const DashboardStateContext = createContext<DashboardStateContextType | undefined>(undefined);

export const DashboardStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<DashboardMode>('loading');
  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <DashboardStateContext.Provider value={value}>
      {children}
    </DashboardStateContext.Provider>
  );
};

export const useDashboardState = () => {
  const context = useContext(DashboardStateContext);
  if (!context) throw new Error('useDashboardState must be used within a DashboardStateProvider');
  return context;
};