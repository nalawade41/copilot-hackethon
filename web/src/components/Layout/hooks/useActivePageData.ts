import { useMode } from '../../../context/ModeContext';
import { useStudyContext } from '../../../context/StudyContext';
import { MODE_LABELS } from '../../../constants';
import { useBrowserStudy } from '../../../pages/BrowserOnlyPage/hooks/useBrowserStudy';
import { useServerStudy } from '../../../pages/ServerBasedPage/hooks/useServerStudy';

/**
 * Exposes the active page's study info + callbacks for the chrome (Toolbar)
 * to display, without the chrome needing to know which page is mounted.
 */
export function useActivePageData() {
  const { mode } = useMode();
  const { states } = useStudyContext();
  const current = states[mode];

  const browser = useBrowserStudy();
  const server = useServerStudy();

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
