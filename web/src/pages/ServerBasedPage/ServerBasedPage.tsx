import { FileDropZone } from '../../components/FileDropZone/FileDropZone';
import { ServerImageViewer } from '../../components/ServerImageViewer/ServerImageViewer';
import { SliceScrubber } from '../../components/SliceScrubber/SliceScrubber';
import { MetadataPanel } from '../../components/MetadataPanel/MetadataPanel';
import { useServerStudy } from './hooks/useServerStudy';
import { useMetadataPanel } from '../../context/MetadataPanelContext';
import { SERVER_URL } from '../../constants';

export function ServerBasedPage() {
  const { study, currentIndex, error, loading, onFiles, setCurrentIndex } = useServerStudy();
  const { open: metadataOpen } = useMetadataPanel();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Uploading to backend…
      </div>
    );
  }

  if (!study) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <FileDropZone onFiles={onFiles} />
          {error && <div className="mt-4 text-sm text-red-400">{error}</div>}
          <div className="mt-4 text-center text-xs text-slate-500">
            Backend expected at <code className="text-slate-400">{SERVER_URL}</code>.
            Start it with{' '}
            <code className="text-slate-400">
              cd backend/CopilotDicom.Api && dotnet run
            </code>
            .
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-w-0">
        <ServerImageViewer
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
