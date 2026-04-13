import { useCallback, type RefObject } from 'react';
import { RenderingEngine, type Types } from '@cornerstonejs/core';
import { CORNERSTONE_IDS } from '../constants';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../../../constants';

export function useZoomControls(engineRef: RefObject<RenderingEngine | null>) {
  const withViewport = useCallback(
    (fn: (v: Types.IStackViewport) => void) => {
      const engine = engineRef.current;
      if (!engine) return;
      const vp = engine.getViewport(CORNERSTONE_IDS.viewportId) as Types.IStackViewport | undefined;
      if (!vp) return;
      fn(vp);
      vp.render();
    },
    [engineRef],
  );

  const zoomIn = useCallback(() => {
    withViewport((vp) => {
      const next = Math.min(Math.max(vp.getZoom() * ZOOM_STEP, MIN_ZOOM), MAX_ZOOM);
      vp.setZoom(next);
    });
  }, [withViewport]);

  const zoomOut = useCallback(() => {
    withViewport((vp) => {
      const next = Math.min(Math.max(vp.getZoom() / ZOOM_STEP, MIN_ZOOM), MAX_ZOOM);
      vp.setZoom(next);
    });
  }, [withViewport]);

  const fit = useCallback(() => {
    withViewport((vp) => vp.resetCamera());
  }, [withViewport]);

  return { zoomIn, zoomOut, fit };
}
