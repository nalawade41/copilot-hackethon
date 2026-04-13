export interface ToolbarProps {
  onFiles: (files: File[]) => void;
  onReset: () => void;
  onToggleMetadata: () => void;
  metadataOpen: boolean;
  studyName: string | null;
  modeLabel: string;
  hasStudy: boolean;
}
