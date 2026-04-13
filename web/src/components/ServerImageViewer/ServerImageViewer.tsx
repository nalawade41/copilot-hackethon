import { useRef } from 'react';
import { ViewerControls } from '../ViewerControls/ViewerControls';
import type { ServerImageViewerProps } from './types';
import { usePanZoom } from './hooks/usePanZoom';
import { useWheelHandler } from './hooks/useWheelHandler';
import { useDragToPan } from './hooks/useDragToPan';
import { useImageDownload } from './hooks/useImageDownload';
import { useResetOnImageChange } from './hooks/useResetOnImageChange';

/**
 * Lightweight viewer for server-rendered PNGs. Cornerstone's GPU pipeline
 * expects medical-imaging metadata (imagePlaneModule, voxelManager, etc.)
 * which doesn't apply to flat PNGs, so server mode uses plain <img> + CSS
 * pan/zoom.
 */
export function ServerImageViewer({ imageIds, currentIndex, onIndexChange }: ServerImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { zoom, pan, fit, setPan, setZoom, setFit, zoomIn, zoomOut, fitToContainer } = usePanZoom();
  const url = imageIds[currentIndex]?.replace(/^web:/, '');

  useWheelHandler(containerRef, imageIds.length, currentIndex, onIndexChange, setZoom, setFit);
  const onMouseDown = useDragToPan(pan, setPan, setFit);
  useResetOnImageChange(url, fitToContainer);
  const download = useImageDownload(url, currentIndex);

  return (
    <div className="flex-1 relative min-h-0 bg-black overflow-hidden">
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
        onContextMenu={(e) => e.preventDefault()}
      >
        {url && (
          <img
            src={url}
            alt="DICOM frame"
            draggable={false}
            className={fit ? 'max-w-full max-h-full object-contain' : ''}
            style={
              fit
                ? { transform: `translate(${pan.x}px, ${pan.y}px)` }
                : {
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                  }
            }
          />
        )}
      </div>
      <ViewerControls onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={fitToContainer} onDownload={download} />
    </div>
  );
}
