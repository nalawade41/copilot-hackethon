import { useCallback, useState } from 'react';
import { useStudyContext } from '../../../context/StudyContext';
import { useMode } from '../../../context/ModeContext';
import { pacsSource } from '../../../service/pacs-ipc.service';
import type { PacsStudyControls } from '../types';
import type { RenderMode } from '../../../types';

const PACS_MODES: RenderMode[] = ['dicomweb-poll', 'dimse-push', 'stowrs-push'];

function isPacsMode(m: RenderMode): boolean {
  return PACS_MODES.includes(m);
}

/**
 * Per-PACS-mode study state. Each protocol mode (dicomweb-poll, dimse-push,
 * stowrs-push) has its own state slot so switching between them preserves
 * what the user had selected.
 *
 * If the current mode isn't a PACS mode, defaults to 'dicomweb-poll' for
 * the slot lookup (the consumer shouldn't be calling this hook outside
 * PACS modes anyway).
 */
export function usePacsStudy(): PacsStudyControls {
  const { mode } = useMode();
  const { states, patch, reset } = useStudyContext();
  const activeMode: RenderMode = isPacsMode(mode) ? mode : 'dicomweb-poll';
  const current = states[activeMode];
  const [selectedUID, setSelectedUID] = useState<string | null>(null);

  const onStudySelected = useCallback(async (uid: string) => {
    setSelectedUID(uid);
    patch(activeMode, { loading: true, error: null });
    try {
      const loaded = await pacsSource.load(uid);
      patch(activeMode, {
        study: loaded,
        currentIndex: 0,
        studyName: loaded.metadata.patientName || uid,
        loading: false,
      });
    } catch (e) {
      patch(activeMode, { error: e instanceof Error ? e.message : String(e), loading: false });
    }
  }, [patch, activeMode]);

  const onReset = useCallback(() => { reset(activeMode); setSelectedUID(null); }, [reset, activeMode]);

  const setCurrentIndex = useCallback(
    (idxOrFn: number | ((prev: number) => number)) => {
      const next = typeof idxOrFn === 'function' ? idxOrFn(current.currentIndex) : idxOrFn;
      patch(activeMode, { currentIndex: next });
    },
    [current.currentIndex, patch, activeMode],
  );

  return {
    study: current.study,
    currentIndex: current.currentIndex,
    studyName: current.studyName,
    error: current.error,
    loading: current.loading,
    selectedUID,
    onStudySelected,
    onReset,
    setCurrentIndex,
  };
}
