import type { ViewerControlsProps } from './types';

/**
 * Floating zoom/fit/download controls shown as an overlay in the bottom-right
 * of a viewer. Pure JSX — all behavior lives in the callbacks passed in.
 */
export function ViewerControls({ onZoomIn, onZoomOut, onFit, onDownload }: ViewerControlsProps) {
  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1 rounded-md bg-slate-900/80 backdrop-blur border border-slate-700 shadow-lg p-1 z-10">
      <button onClick={onZoomIn} title="Zoom in" className="w-8 h-8 flex items-center justify-center rounded text-slate-200 hover:bg-slate-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button onClick={onZoomOut} title="Zoom out" className="w-8 h-8 flex items-center justify-center rounded text-slate-200 hover:bg-slate-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div className="h-px bg-slate-700 my-0.5" />
      <button onClick={onFit} title="Fit to screen" className="w-8 h-8 flex items-center justify-center rounded text-slate-200 hover:bg-slate-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
        </svg>
      </button>
      {onDownload && (
        <>
          <div className="h-px bg-slate-700 my-0.5" />
          <button onClick={onDownload} title="Download current frame" className="w-8 h-8 flex items-center justify-center rounded text-slate-200 hover:bg-slate-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
