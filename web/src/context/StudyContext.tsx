import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoadedStudy, RenderMode } from '../types';

interface ModeState {
  study: LoadedStudy | null;
  currentIndex: number;
  studyName: string | null;
  error: string | null;
  loading: boolean;
}

const EMPTY: ModeState = {
  study: null,
  currentIndex: 0,
  studyName: null,
  error: null,
  loading: false,
};

interface StudyContextValue {
  /** Per-mode state; switching modes does not mutate these. */
  states: Record<RenderMode, ModeState>;
  /** Replace a subset of one mode's state. */
  patch: (m: RenderMode, next: Partial<ModeState>) => void;
  /** Reset a specific mode to empty (releasing blob URLs if present). */
  reset: (m: RenderMode) => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<RenderMode, ModeState>>({
    client: { ...EMPTY },
    server: { ...EMPTY },
  });

  const patch = useCallback((m: RenderMode, next: Partial<ModeState>) => {
    setStates((s) => ({ ...s, [m]: { ...s[m], ...next } }));
  }, []);

  const reset = useCallback((m: RenderMode) => {
    setStates((s) => {
      const current = s[m];
      if (current.study) {
        for (const id of current.study.imageIds) {
          if (id.startsWith('wadouri:blob:')) {
            URL.revokeObjectURL(id.replace(/^wadouri:/, ''));
          }
        }
      }
      return { ...s, [m]: { ...EMPTY } };
    });
  }, []);

  const value = useMemo<StudyContextValue>(
    () => ({ states, patch, reset }),
    [states, patch, reset],
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudyContext(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudyContext must be used inside <StudyProvider>');
  return ctx;
}

export type { ModeState };
