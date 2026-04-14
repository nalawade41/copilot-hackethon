import { useEffect, useState } from 'react';
import type { PacsStudyListControls } from '../types';
import type { PacsStudy } from '../../../types';

export function usePacsStudyList(): PacsStudyListControls {
  const [studies, setStudies] = useState<PacsStudy[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.pacs) {
      setConnectionError('Electron not available — PACS mode requires the desktop app.');
      return;
    }
    window.pacs.listStudies()
      .then((s) => { setStudies(s); setConnectionError(null); })
      .catch((e) => setConnectionError(e instanceof Error ? e.message : String(e)));

    const unsubChange = window.pacs.onStudiesChanged((s) => { setStudies(s); setConnectionError(null); });
    const unsubErr = window.pacs.onConnectionError((msg) => setConnectionError(msg));
    return () => { unsubChange(); unsubErr(); };
  }, []);

  return { studies, connectionError };
}
