import type { RenderMode } from '../types/mode.types.ts';

export const MODE_LABELS: Record<RenderMode, string> = {
  client: 'Browser only',
  server: 'Server based',
};
