import { useEffect } from 'react';

/**
 * Resets pan/zoom to "fit to container" whenever the displayed image URL
 * changes. Keeps the viewer predictable when scrubbing between frames.
 */
export function useResetOnImageChange(url: string | undefined, reset: () => void): void {
  useEffect(() => {
    reset();
  }, [url, reset]);
}
