import type { LoadedStudy } from '../../../types';

export interface ServerStudyControls {
  study: LoadedStudy | null;
  currentIndex: number;
  studyName: string | null;
  error: string | null;
  loading: boolean;
  onFiles: (files: File[]) => Promise<void>;
  onReset: () => void;
  setCurrentIndex: (i: number | ((prev: number) => number)) => void;
}
