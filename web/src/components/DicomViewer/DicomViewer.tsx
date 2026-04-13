import { useRef } from 'react';
import { ViewerControls } from '../ViewerControls/ViewerControls';
import type { DicomViewerProps } from './types';
import { useCornerstoneEngine } from './hooks/useCornerstoneEngine';
import { useToolBindings } from './hooks/useToolBindings';
import { useStackLoader } from './hooks/useStackLoader';
import { useSliceSync } from './hooks/useSliceSync';
import { useContainerResize } from './hooks/useContainerResize';
import { useZoomControls } from './hooks/useZoomControls';
import { useFrameDownload } from './hooks/useFrameDownload';

export function DicomViewer({ imageIds, currentIndex, onIndexChange }: DicomViewerProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const engineRef = useCornerstoneEngine(elementRef);
  useToolBindings(imageIds);
  const error = useStackLoader(engineRef, imageIds, currentIndex);
  useSliceSync(engineRef, elementRef, imageIds, currentIndex, onIndexChange);
  useContainerResize(engineRef, elementRef);
  const { zoomIn, zoomOut, fit } = useZoomControls(engineRef);
  const download = useFrameDownload(imageIds, currentIndex);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm p-8">
        Error rendering DICOM: {error}
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0 bg-black">
      <div
        ref={elementRef}
        className="absolute inset-0"
        onContextMenu={(e) => e.preventDefault()}
      />
      <ViewerControls onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={fit} onDownload={download} />
    </div>
  );
}
