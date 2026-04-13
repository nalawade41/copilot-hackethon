export interface FileDropZoneProps {
  onFiles: (files: File[]) => void;
  /** When true, render as a compact bar (after a study is loaded). */
  compact?: boolean;
  /** Minimum file count that triggers the confirmation modal. Default 2. */
  confirmThreshold?: number;
}
