import { useCallback, useMemo } from 'react';
import { useStudyContext } from '../../../context/StudyContext';
import { makeServerSource } from '../../../service/dicom-api.service';
import { SERVER_URL } from '../../../constants';
import type { ServerStudyControls } from '../types';

const MODE = 'server' as const;

/**
 * All server-mode study state + actions. Keeps a single serverSource instance
 * across renders via useMemo (it's tied to the base URL).
 */
export function useServerStudy(): ServerStudyControls {
  const { states, patch, reset } = useStudyContext();
  const current = states[MODE];
  const serverSource = useMemo(() => makeServerSource(SERVER_URL), []);

  const onFiles = useCallback(
    async (files: File[]) => {
      patch(MODE, { loading: true, error: null });
      try {
        const loaded = await serverSource.load(files);
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
    [patch, serverSource],
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
