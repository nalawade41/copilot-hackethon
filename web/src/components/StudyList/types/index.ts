import type { PacsStudy } from '../../../types';

export interface StudyListProps {
  studies: PacsStudy[];
  selectedUID: string | null;
  onSelect: (uid: string) => void;
  /** Empty-state hint shown when no studies are available. */
  emptyStateHint?: React.ReactNode;
  /** Persistent footer link shown regardless of list state. */
  footerHint?: React.ReactNode;
}
