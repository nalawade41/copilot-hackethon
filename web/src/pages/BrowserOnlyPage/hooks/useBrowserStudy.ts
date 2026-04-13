import { useCallback } from 'react';
import { useStudyContext } from '../../../context/StudyContext';
import { fileSource } from '../../../lib/utility/file-source';
import type { BrowserStudyControls } from '../types';

const MODE = 'client' as const;

/** All client-mode study state + actions, read from shared context. */
export function useBrowserStudy(): BrowserStudyControls {
  const { states, patch, reset } = useStudyContext();
  const current = states[MODE];

  const onFiles = useCallback(
    async (files: File[]) => {
      patch(MODE, { loading: true, error: null });
      try {
        const loaded = await fileSource.load(files);
        patch(MODE, {
          study: loaded,
          currentIndex: 0,
          studyName: files.length === 1 ? files[0].name : `${files.length} slices`,
          loading: false,
        });
      } catch (e) {
        patch(MODE, {
          error: e instanceof Error ? e.message : String(e),
          loading: false,
        });
      }
    },
    [patch],
  );

  const onReset = useCallback(() => reset(MODE), [reset]);

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
    onFiles,
    onReset,
    setCurrentIndex,
  };
}
