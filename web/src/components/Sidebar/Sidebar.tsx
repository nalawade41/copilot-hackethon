import type { SidebarProps } from './types';
import { SIDEBAR_ITEMS } from './sidebar-items';

export function Sidebar({ mode, onChange }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900/60 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="text-sm font-semibold tracking-tight">
          Copilot <span className="text-accent">DICOM</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">Viewer hackathon</div>
      </div>
      <nav className="flex-1 p-2">
        {SIDEBAR_ITEMS.map((item) => {
          const selected = mode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => onChange(item.mode)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors
                ${selected
                  ? 'bg-accent/15 text-slate-50 ring-1 ring-accent/40'
                  : 'text-slate-300 hover:bg-slate-800/70'}`}
            >
              <span className={selected ? 'text-accent mt-0.5' : 'text-slate-500 mt-0.5'}>
                {item.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                  {item.sublabel}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-3 border-t border-slate-800 text-[11px] text-slate-600">
        Phase 1 · Phase 2
      </div>
    </aside>
  );
}
