import { useMode } from '../../../context/ModeContext';
import { useStudyContext } from '../../../context/StudyContext';
import { MODE_LABELS } from '../../../constants';
import { useBrowserStudy } from '../../../pages/BrowserOnlyPage/hooks/useBrowserStudy';
import { useServerStudy } from '../../../pages/ServerBasedPage/hooks/useServerStudy';
import { usePacsStudy } from '../../../pages/PacsPage/hooks/usePacsStudy';

const PACS_MODES = new Set(['dicomweb-poll', 'dimse-push', 'stowrs-push']);

export function useActivePageData() {
  const { mode } = useMode();
  const { states } = useStudyContext();

  const browser = useBrowserStudy();
  const server = useServerStudy();
  const pacs = usePacsStudy();

  if (mode === 'about' || mode === 'download') {
    return {
      mode,
      modeLabel: MODE_LABELS[mode],
      studyName: null,
      hasStudy: false,
      onFiles: async () => {},
      onReset: () => {},
    };
  }

  if (PACS_MODES.has(mode)) {
    const current = states[mode];
    return {
      mode,
      modeLabel: MODE_LABELS[mode],
      studyName: current.studyName,
      hasStudy: !!current.study,
      onFiles: async () => {},
      onReset: pacs.onReset,
    };
  }

  const current = states[mode];
  const active = mode === 'client' ? browser : server;
  return {
    mode,
    modeLabel: MODE_LABELS[mode],
    studyName: current.studyName,
    hasStudy: !!current.study,
    onFiles: active.onFiles,
    onReset: active.onReset,
  };
}
