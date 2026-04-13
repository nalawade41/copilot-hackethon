import { Sidebar } from '../Sidebar/Sidebar';
import { Toolbar } from '../Toolbar/Toolbar';
import { BrowserOnlyPage } from '../../pages/BrowserOnlyPage/BrowserOnlyPage';
import { ServerBasedPage } from '../../pages/ServerBasedPage/ServerBasedPage';
import { useMode } from '../../context/ModeContext';
import { useMetadataPanel } from '../../context/MetadataPanelContext';
import { useActivePageData } from './hooks/useActivePageData';

export function Layout() {
  const { mode, setMode } = useMode();
  const { open: metadataOpen, toggle: toggleMetadata } = useMetadataPanel();
  const { modeLabel, studyName, hasStudy, onFiles, onReset } = useActivePageData();

  return (
    <div className="h-screen flex">
      <Sidebar mode={mode} onChange={setMode} />
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar
          onFiles={onFiles}
          onReset={onReset}
          onToggleMetadata={toggleMetadata}
          metadataOpen={metadataOpen}
          studyName={studyName}
          modeLabel={modeLabel}
          hasStudy={hasStudy}
        />
        {mode === 'client' ? <BrowserOnlyPage /> : <ServerBasedPage />}
      </div>
    </div>
  );
}
