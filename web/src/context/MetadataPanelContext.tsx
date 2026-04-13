import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface MetadataPanelContextValue {
  open: boolean;
  toggle: () => void;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<MetadataPanelContextValue | null>(null);

export function MetadataPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const toggle = () => setOpen((v) => !v);
  return <Ctx.Provider value={{ open, toggle, setOpen }}>{children}</Ctx.Provider>;
}

export function useMetadataPanel(): MetadataPanelContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMetadataPanel must be used inside <MetadataPanelProvider>');
  return ctx;
}
