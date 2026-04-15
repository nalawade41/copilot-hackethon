import { useEffect, useMemo, useState } from 'react';
import { useMode } from '../../../context/ModeContext';
import type { PacsStudyListControls } from '../types';
import type { PacsStudy, RenderMode } from '../../../types';

const TAG_DIMSE = '[DIMSE C-STORE (TCP)]';
const TAG_STOW = '[STOW-RS (HTTP)]';

/**
 * Filters the full Orthanc study list by the active PACS protocol mode.
 * Each study is tagged in its description by the vendor simulator's Lua
 * script — that's how we know which protocol delivered it.
 *
 * - dicomweb-poll: untagged studies (uploaded directly via DICOMweb / web UI)
 * - dimse-push:    studies tagged with [DIMSE C-STORE (TCP)]
 * - stowrs-push:   studies tagged with [STOW-RS (HTTP)]
 */
function filterByMode(studies: PacsStudy[], mode: RenderMode): PacsStudy[] {
  if (mode === 'dimse-push') {
    return studies.filter((s) => s.description?.includes(TAG_DIMSE));
  }
  if (mode === 'stowrs-push') {
    return studies.filter((s) => s.description?.includes(TAG_STOW));
  }
  if (mode === 'dicomweb-poll') {
    return studies.filter((s) => {
      const d = s.description ?? '';
      return !d.includes(TAG_DIMSE) && !d.includes(TAG_STOW);
    });
  }
  return studies;
}

export function usePacsStudyList(): PacsStudyListControls {
  const { mode } = useMode();
  const [allStudies, setAllStudies] = useState<PacsStudy[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.pacs) {
      setConnectionError('Electron not available — PACS mode requires the desktop app.');
      return;
    }
    window.pacs.listStudies()
      .then((s) => { setAllStudies(s); setConnectionError(null); })
      .catch((e) => setConnectionError(e instanceof Error ? e.message : String(e)));

    const unsubChange = window.pacs.onStudiesChanged((s) => {
      setAllStudies(s);
      setConnectionError(null);
    });
    const unsubErr = window.pacs.onConnectionError((msg) => setConnectionError(msg));
    return () => { unsubChange(); unsubErr(); };
  }, []);

  const studies = useMemo(() => filterByMode(allStudies, mode), [allStudies, mode]);

  return { studies, connectionError };
}
