import { DicomViewer } from '../../components/DicomViewer/DicomViewer';
import { SliceScrubber } from '../../components/SliceScrubber/SliceScrubber';
import { MetadataPanel } from '../../components/MetadataPanel/MetadataPanel';
import { StudyList } from '../../components/StudyList/StudyList';
import { useMetadataPanel } from '../../context/MetadataPanelContext';
import { usePacsStudyList } from './hooks/usePacsStudyList';
import { usePacsStudy } from './hooks/usePacsStudy';

export function PacsPage() {
  const { studies, connectionError } = usePacsStudyList();
  const { study, currentIndex, error, loading, selectedUID, onStudySelected, setCurrentIndex } = usePacsStudy();
  const { open: metadataOpen } = useMetadataPanel();

  return (
    <div className="flex-1 flex min-h-0">
      <StudyList studies={studies} selectedUID={selectedUID} onSelect={onStudySelected} />
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
