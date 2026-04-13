import { FileDropZone } from '../FileDropZone/FileDropZone';
import type { ToolbarProps } from './types';

export function Toolbar({
  onFiles,
  onReset,
  onToggleMetadata,
  metadataOpen,
  studyName,
  modeLabel,
  hasStudy,
}: ToolbarProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-800 bg-slate-950">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs uppercase tracking-wider text-slate-500">{modeLabel}</span>
        {studyName && (
          <>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-300 truncate">{studyName}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <FileDropZone onFiles={onFiles} compact />
        {hasStudy && (
          <>
            <button
              onClick={onReset}
              className="px-3 py-1.5 text-sm rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              Close
            </button>
            <button
              onClick={onToggleMetadata}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                metadataOpen
                  ? 'bg-accent text-slate-950 border-accent'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
            >
              Metadata
            </button>
          </>
        )}
      </div>
    </header>
  );
}
