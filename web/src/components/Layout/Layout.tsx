import { Sidebar } from '../Sidebar/Sidebar';
import { Toolbar } from '../Toolbar/Toolbar';
import { AboutPage } from '../../pages/AboutPage/AboutPage';
import { BrowserOnlyPage } from '../../pages/BrowserOnlyPage/BrowserOnlyPage';
import { ServerBasedPage } from '../../pages/ServerBasedPage/ServerBasedPage';
import { PacsPage } from '../../pages/PacsPage/PacsPage';
import { DownloadPage } from '../../pages/DownloadPage/DownloadPage';
import { useMode } from '../../context/ModeContext';
import { useMetadataPanel } from '../../context/MetadataPanelContext';
import { useActivePageData } from './hooks/useActivePageData';

const PACS_MODES = new Set(['dicomweb-poll', 'dimse-push', 'stowrs-push']);

export function Layout() {
  const { mode, setMode } = useMode();
  const { open: metadataOpen, toggle: toggleMetadata } = useMetadataPanel();
  const { modeLabel, studyName, hasStudy, onFiles, onReset } = useActivePageData();

  const isPacs = PACS_MODES.has(mode);
  const isViewer = mode !== 'about' && mode !== 'download';

  return (
    <div className="h-screen flex">
      <Sidebar mode={mode} onChange={setMode} />
      <div className="flex-1 flex flex-col min-w-0">
        {isViewer && (
          <Toolbar
            onFiles={onFiles}
            onReset={onReset}
            onToggleMetadata={toggleMetadata}
            metadataOpen={metadataOpen}
            studyName={studyName}
            modeLabel={modeLabel}
            hasStudy={hasStudy}
            showFilePicker={!isPacs}
          />
        )}
        {mode === 'about' && <AboutPage />}
        {mode === 'client' && <BrowserOnlyPage />}
        {mode === 'server' && <ServerBasedPage />}
        {isPacs && <PacsPage />}
        {mode === 'download' && <DownloadPage />}
      </div>
    </div>
  );
}
