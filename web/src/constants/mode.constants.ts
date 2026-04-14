import type { RenderMode } from '../types/mode.types.ts';

export const MODE_LABELS: Record<RenderMode, string> = {
  about: 'How it works',
  client: 'Browser only',
  server: 'Server based',
  pacs: 'PACS',
  download: 'Desktop App',
};
