import { FileDropZone } from '../../components/FileDropZone/FileDropZone';
import { DicomViewer } from '../../components/DicomViewer/DicomViewer';
import { SliceScrubber } from '../../components/SliceScrubber/SliceScrubber';
import { MetadataPanel } from '../../components/MetadataPanel/MetadataPanel';
import { useBrowserStudy } from './hooks/useBrowserStudy';
import { useMetadataPanel } from '../../context/MetadataPanelContext';

export function BrowserOnlyPage() {
  const { study, currentIndex, error, loading, onFiles, setCurrentIndex } = useBrowserStudy();
  const { open: metadataOpen } = useMetadataPanel();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!study) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <FileDropZone onFiles={onFiles} />
          {error && <div className="mt-4 text-sm text-red-400">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-w-0">
        <DicomViewer
          imageIds={study.imageIds}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
        />
        <SliceScrubber
          total={study.imageIds.length}
          current={currentIndex}
          onChange={setCurrentIndex}
        />
      </div>
      {metadataOpen && <MetadataPanel metadata={study.metadata} />}
    </div>
  );
}
