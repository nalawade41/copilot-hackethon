import type { SliceScrubberProps } from './types';

export function SliceScrubber({ total, current, onChange }: SliceScrubberProps) {
  if (total <= 1) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-800 bg-slate-900/60">
      <span className="text-xs text-slate-500 tabular-nums w-16 shrink-0">
        {current + 1} / {total}
      </span>
      <input
        type="range"
        min={0}
        max={total - 1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-accent"
      />
    </div>
  );
}
