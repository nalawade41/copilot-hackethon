export interface ServerImageViewerProps {
  imageIds: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export interface PanState {
  x: number;
  y: number;
}
