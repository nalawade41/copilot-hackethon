import type { ConfirmDialogProps } from './types';
import { useDialogKeys } from './hooks/useDialogKeys';

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Load',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useDialogKeys(open, onConfirm, onCancel);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        </div>
        <div className="px-5 pb-5 text-sm text-slate-300">{body}</div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-800 bg-slate-900/60 rounded-b-xl">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm rounded-md bg-accent hover:bg-accent-muted text-slate-950 font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
