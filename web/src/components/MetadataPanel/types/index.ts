import type { StudyMetadata } from '../../../types';

export interface MetadataPanelProps {
  metadata: StudyMetadata;
}

export interface MetadataRow {
  label: string;
  key: keyof StudyMetadata;
  format?: (v: string) => string;
}
