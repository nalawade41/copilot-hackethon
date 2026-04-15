import { DicomViewer } from '../../components/DicomViewer/DicomViewer';
import { SliceScrubber } from '../../components/SliceScrubber/SliceScrubber';
import { MetadataPanel } from '../../components/MetadataPanel/MetadataPanel';
import { StudyList } from '../../components/StudyList/StudyList';
import { useMetadataPanel } from '../../context/MetadataPanelContext';
import { useMode } from '../../context/ModeContext';
import { usePacsStudyList } from './hooks/usePacsStudyList';
import { usePacsStudy } from './hooks/usePacsStudy';

const VENDOR_SIM_URL = import.meta.env.VITE_VENDOR_SIM_URL ?? 'https://copilot-hackethon-vendor-sim.onrender.com';
const ORTHANC_GATEWAY_URL = import.meta.env.VITE_ORTHANC_URL ?? 'https://copilot-hackethon-production.up.railway.app';

interface ProtocolHints {
  empty: React.ReactNode;
  footer: React.ReactNode;
}

function getHints(mode: string): ProtocolHints {
  if (mode === 'dimse-push' || mode === 'stowrs-push') {
    const protocol = mode === 'dimse-push' ? 'DIMSE C-STORE (TCP)' : 'STOW-RS (HTTP)';
    const host = VENDOR_SIM_URL.replace(/^https?:\/\//, '');
    return {
      empty: (
        <>
          No studies received via <span className="text-slate-300">{protocol}</span> yet.
          Upload a DICOM to the vendor simulator below — it auto-pushes via {protocol} to our gateway.
        </>
      ),
      footer: (
        <>
          <div className="text-slate-600 text-[10px] uppercase tracking-wider mb-1">
            Upload to simulate {protocol}
          </div>
          <a
            className="text-accent hover:underline break-all"
            href={VENDOR_SIM_URL}
            target="_blank"
            rel="noreferrer"
          >
            ↗ {host}
          </a>
        </>
      ),
    };
  }
  // dicomweb-poll
  const host = ORTHANC_GATEWAY_URL.replace(/^https?:\/\//, '');
  return {
    empty: (
      <>
        No studies uploaded directly yet. Upload a DICOM to the gateway Orthanc below.
      </>
    ),
    footer: (
      <>
        <div className="text-slate-600 text-[10px] uppercase tracking-wider mb-1">
          Upload directly to gateway
        </div>
        <a
          className="text-accent hover:underline break-all"
          href={ORTHANC_GATEWAY_URL}
          target="_blank"
          rel="noreferrer"
        >
          ↗ {host}
        </a>
      </>
    ),
  };
}

export function PacsPage() {
  const { mode } = useMode();
  const { studies, connectionError } = usePacsStudyList();
  const { study, currentIndex, error, loading, selectedUID, onStudySelected, setCurrentIndex } = usePacsStudy();
  const { open: metadataOpen } = useMetadataPanel();

  const hints = getHints(mode);

  return (
    <div className="flex-1 flex min-h-0">
      <StudyList
        studies={studies}
        selectedUID={selectedUID}
        onSelect={onStudySelected}
        emptyStateHint={hints.empty}
        footerHint={hints.footer}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {connectionError && (
          <div className="px-4 py-2 bg-red-950/60 border-b border-red-800 text-xs text-red-300">
            {connectionError}
          </div>
        )}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Fetching study from PACS…</div>
        ) : !study ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-8 text-center">
            {error ?? 'Select a study from the list to view it.'}
          </div>
        ) : (
          <>
            <DicomViewer imageIds={study.imageIds} currentIndex={currentIndex} onIndexChange={setCurrentIndex} />
            <SliceScrubber total={study.imageIds.length} current={currentIndex} onChange={setCurrentIndex} />
          </>
        )}
      </div>
      {metadataOpen && study && <MetadataPanel metadata={study.metadata} />}
    </div>
  );
}
