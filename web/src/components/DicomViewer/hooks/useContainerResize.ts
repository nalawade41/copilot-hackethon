import { useEffect, type RefObject } from 'react';
import { RenderingEngine } from '@cornerstonejs/core';

/**
 * Observes the viewport container for size changes (window resize, DevTools
 * toggle, sidebar show/hide) and tells Cornerstone to resize its canvas.
 */
export function useContainerResize(
  engineRef: RefObject<RenderingEngine | null>,
  elementRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      engineRef.current?.resize(true, true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [engineRef, elementRef]);
}
