import { useEffect, type RefObject } from 'react';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../../../constants';

/**
 * Wheel handling for the server viewer:
 *  - Ctrl/Cmd + wheel → zoom
 *  - plain wheel     → stack scroll (if stack has >1 image)
 */
export function useWheelHandler(
  ref: RefObject<HTMLElement | null>,
  imageCount: number,
  currentIndex: number,
  onIndexChange: (i: number) => void,
  setZoom: (fn: (z: number) => number) => void,
  setFit: (f: boolean) => void,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setFit(false);
        setZoom((z) => {
          const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
          return Math.min(Math.max(z * factor, MIN_ZOOM), MAX_ZOOM);
        });
      } else if (imageCount > 1) {
        const delta = e.deltaY > 0 ? 1 : -1;
        onIndexChange(Math.min(Math.max(currentIndex + delta, 0), imageCount - 1));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref, imageCount, currentIndex, onIndexChange, setZoom, setFit]);
}
