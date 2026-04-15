import type { RenderMode } from '../types/mode.types.ts';

export const MODE_LABELS: Record<RenderMode, string> = {
  about: 'How it works',
  client: 'Browser only',
  server: 'Server based',
  'dicomweb-poll': 'DICOMweb (Poll)',
  'dimse-push': 'DIMSE C-STORE (Push)',
  'stowrs-push': 'STOW-RS (Push)',
  download: 'Desktop App',
};
