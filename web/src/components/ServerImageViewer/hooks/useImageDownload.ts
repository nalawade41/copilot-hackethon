import { useCallback } from 'react';
import { downloadFromUrl } from '../../../lib/utility/download';

export function useImageDownload(url: string | undefined, currentIndex: number) {
  return useCallback(async () => {
    if (!url) return;
    const filename = `frame-${String(currentIndex + 1).padStart(3, '0')}.png`;
    try {
      await downloadFromUrl(url, filename);
    } catch {
      /* silent */
    }
  }, [url, currentIndex]);
}
