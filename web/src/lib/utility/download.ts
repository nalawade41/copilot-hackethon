/**
 * Trigger a browser file download for the given blob.
 * Uses a throwaway <a> tag + object URL, which is the standard same-tab
 * download pattern that works across all browsers.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/**
 * Fetch a URL and trigger a download of the response body.
 */
export async function downloadFromUrl(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const blob = await res.blob();
  triggerDownload(blob, filename);
}
