import type { PacsStudy } from '../../../types';

export interface StudyListProps {
  studies: PacsStudy[];
  selectedUID: string | null;
  onSelect: (uid: string) => void;
}
