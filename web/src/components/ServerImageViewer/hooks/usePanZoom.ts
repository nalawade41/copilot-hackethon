import { useCallback, useState } from 'react';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../../../constants';
import type { PanState } from '../types';

/**
 * Core pan+zoom state for the PNG viewer. When `fit` is true, the image is
 * CSS-fitted to the container (object-contain); any pan/zoom action turns
 * `fit` off so the manual transform takes over.
 */
export function usePanZoom() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [fit, setFit] = useState(true);

  const zoomIn = useCallback(() => {
    setFit(false);
    setZoom((z) => Math.min(Math.max(z * ZOOM_STEP, MIN_ZOOM), MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setFit(false);
    setZoom((z) => Math.min(Math.max(z / ZOOM_STEP, MIN_ZOOM), MAX_ZOOM));
  }, []);

  const fitToContainer = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setFit(true);
  }, []);

  return { zoom, pan, fit, setPan, setZoom, setFit, zoomIn, zoomOut, fitToContainer };
}
