import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { RenderMode } from '../types';

interface ModeContextValue {
  mode: RenderMode;
  setMode: (m: RenderMode) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<RenderMode>('client');
  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used inside <ModeProvider>');
  return ctx;
}
