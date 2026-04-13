import { useCallback } from 'react';
import { downloadFromUrl } from '../../../lib/utility/download';

/**
 * Returns a callback that downloads the current frame. Strips the
 * cornerstone scheme prefix (`web:` → PNG, `wadouri:` → DICOM) before
 * fetching, and picks a matching file extension.
 */
export function useFrameDownload(imageIds: string[], currentIndex: number) {
  return useCallback(async () => {
    const id = imageIds[currentIndex];
    if (!id) return;
    const url = id.replace(/^(web:|wadouri:)/, '');
    const ext = id.startsWith('web:') ? 'png' : 'dcm';
    const filename = `frame-${String(currentIndex + 1).padStart(3, '0')}.${ext}`;
    try {
      await downloadFromUrl(url, filename);
    } catch {
      // Silent failure — user sees no download; could toast in the future.
    }
  }, [imageIds, currentIndex]);
}
