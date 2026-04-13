export interface DicomViewerProps {
  imageIds: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export interface CornerstoneIds {
  readonly renderingEngineId: string;
  readonly viewportId: string;
  readonly toolGroupId: string;
}
