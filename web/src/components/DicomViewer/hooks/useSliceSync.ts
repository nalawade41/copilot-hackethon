import { useEffect, type RefObject } from 'react';
import { RenderingEngine, Enums, type Types } from '@cornerstonejs/core';
import { CORNERSTONE_IDS } from '../constants';

/**
 * Keeps the Cornerstone viewport's current slice in sync with the parent's
 * `currentIndex` state, and vice-versa when Cornerstone scrolls the stack
 * itself (mouse wheel).
 */
export function useSliceSync(
  engineRef: RefObject<RenderingEngine | null>,
  elementRef: RefObject<HTMLDivElement | null>,
  imageIds: string[],
  currentIndex: number,
  onIndexChange: (index: number) => void,
) {
  // Drive Cornerstone from React state.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || imageIds.length === 0) return;
    const viewport = engine.getViewport(CORNERSTONE_IDS.viewportId) as Types.IStackViewport;
    const idx = Math.min(Math.max(currentIndex, 0), imageIds.length - 1);
    if (viewport.getCurrentImageIdIndex() !== idx) {
      viewport.setImageIdIndex(idx).then(() => viewport.render());
    }
  }, [engineRef, currentIndex, imageIds]);

  // Drive React state from Cornerstone's own wheel scroll.
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as { newImageIdIndex?: number };
      if (typeof detail?.newImageIdIndex === 'number') {
        onIndexChange(detail.newImageIdIndex);
      }
    };
    element.addEventListener(Enums.Events.STACK_NEW_IMAGE, handler);
    return () => {
      element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, handler);
    };
  }, [elementRef, onIndexChange]);
}
