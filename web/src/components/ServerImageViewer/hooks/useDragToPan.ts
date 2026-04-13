import { useCallback, useEffect, useRef } from 'react';
import type { PanState } from '../types';

/**
 * Wires left-button drag on the viewer to update the pan offset.
 * Returns a `onMouseDown` handler to attach to the drag surface.
 */
export function useDragToPan(
  pan: PanState,
  setPan: (p: PanState) => void,
  setFit: (f: boolean) => void,
) {
  const dragStart = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setFit(false);
      dragStart.current = { x: e.clientX, y: e.clientY, origX: pan.x, origY: pan.y };
    },
    [pan.x, pan.y, setFit],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      setPan({
        x: dragStart.current.origX + (e.clientX - dragStart.current.x),
        y: dragStart.current.origY + (e.clientY - dragStart.current.y),
      });
    };
    const onUp = () => { dragStart.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setPan]);

  return onMouseDown;
}
