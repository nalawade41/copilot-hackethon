import { useCallback, useState } from 'react';
import { useStudyContext } from '../../../context/StudyContext';
import { pacsSource } from '../../../service/pacs-ipc.service';
import type { PacsStudyControls } from '../types';

const MODE = 'pacs' as const;

export function usePacsStudy(): PacsStudyControls {
  const { states, patch, reset } = useStudyContext();
  const current = states[MODE];
  const [selectedUID, setSelectedUID] = useState<string | null>(null);

  const onStudySelected = useCallback(async (uid: string) => {
    setSelectedUID(uid);
    patch(MODE, { loading: true, error: null });
    try {
      const loaded = await pacsSource.load(uid);
      patch(MODE, {
        study: loaded,
        currentIndex: 0,
        studyName: loaded.metadata.patientName || uid,
        loading: false,
      });
    } catch (e) {
      patch(MODE, { error: e instanceof Error ? e.message : String(e), loading: false });
    }
  }, [patch]);

  const onReset = useCallback(() => { reset(MODE); setSelectedUID(null); }, [reset]);

  const setCurrentIndex = useCallback(
    (idxOrFn: number | ((prev: number) => number)) => {
      const next = typeof idxOrFn === 'function' ? idxOrFn(current.currentIndex) : idxOrFn;
      patch(MODE, { currentIndex: next });
    },
    [current.currentIndex, patch],
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
