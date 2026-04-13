import type { MetadataPanelProps } from './types';
import { METADATA_ROWS } from './metadata-rows';

export function MetadataPanel({ metadata }: MetadataPanelProps) {
  return (
    <aside className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Study metadata</h2>
      <dl className="space-y-2 text-sm">
        {METADATA_ROWS.map(({ label, key, format }) => {
          const raw = metadata[key];
          const display = raw ? (format ? format(raw) : raw) : '—';
          return (
            <div key={key} className="grid grid-cols-[7rem_1fr] gap-2">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-200 truncate" title={display}>{display}</dd>
            </div>
          );
        })}
      </dl>
    </aside>
  );
}
