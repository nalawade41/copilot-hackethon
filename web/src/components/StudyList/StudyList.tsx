import type { StudyListProps } from './types';

function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || '—';
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function StudyList({ studies, selectedUID, onSelect, emptyStateHint, footerHint }: StudyListProps) {
  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-wider text-slate-500">PACS studies</h2>
        <p className="text-xs text-slate-600 mt-1">{studies.length} available</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {studies.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">{emptyStateHint ?? 'No studies yet.'}</div>
        ) : (
          <ul>
            {studies.map((s) => (
              <li
                key={s.studyInstanceUID}
                onClick={() => onSelect(s.studyInstanceUID)}
                className={`px-4 py-3 border-b border-slate-800 cursor-pointer text-sm
                  ${selectedUID === s.studyInstanceUID ? 'bg-accent/10' : 'hover:bg-slate-800/60'}`}
              >
                <div className="text-slate-200 truncate">{s.patientName || '(no name)'}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.modality} · {formatDate(s.studyDate)}</div>
                {s.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{s.description}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {footerHint && (
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 bg-slate-950/40">
          {footerHint}
        </div>
      )}
    </aside>
  );
}
