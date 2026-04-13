import { useEffect, useState, type RefObject } from 'react';
import { RenderingEngine, type Types } from '@cornerstonejs/core';
import { CORNERSTONE_IDS } from '../constants';

/**
 * Loads/reloads the stack on the viewport when imageIds change. Also forces
 * an engine.resize() before render to avoid the 0×0-canvas-thumbnail bug,
 * and resets the camera so the image fits the viewport.
 *
 * Returns an error string if the underlying load threw.
 */
export function useStackLoader(
  engineRef: RefObject<RenderingEngine | null>,
  imageIds: string[],
  currentIndex: number,
) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || imageIds.length === 0) return;
    const viewport = engine.getViewport(CORNERSTONE_IDS.viewportId) as Types.IStackViewport;
    let cancelled = false;

    (async () => {
      try {
        engine.resize(true, true);
        await viewport.setStack(imageIds, Math.min(currentIndex, imageIds.length - 1));
        if (!cancelled) {
          viewport.resetCamera();
          viewport.render();
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Slice changes handled by a separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIds, engineRef]);

  return error;
}
