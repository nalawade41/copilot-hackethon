import { useEffect, useRef } from 'react';

/**
 * Focuses the confirm button on open and wires Enter/Escape shortcuts.
 * Returns the ref to attach to the confirm button.
 */
export function useDialogKeys(
  open: boolean,
  onConfirm: () => void,
  onCancel: () => void,
) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onConfirm, onCancel]);

  return confirmRef;
}
