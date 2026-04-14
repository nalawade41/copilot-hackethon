import type { LoadedStudy, PacsStudy } from '../../../types';

export interface PacsStudyListControls {
  studies: PacsStudy[];
  connectionError: string | null;
}

export interface PacsStudyControls {
  study: LoadedStudy | null;
  currentIndex: number;
  studyName: string | null;
  error: string | null;
  loading: boolean;
  selectedUID: string | null;
  onStudySelected: (uid: string) => Promise<void>;
  onReset: () => void;
  setCurrentIndex: (i: number | ((prev: number) => number)) => void;
}
