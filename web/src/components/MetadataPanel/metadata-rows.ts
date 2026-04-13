import type { MetadataRow } from './types';

function formatDicomDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export const METADATA_ROWS: MetadataRow[] = [
  { label: 'Patient',      key: 'patientName' },
  { label: 'Patient ID',   key: 'patientId' },
  { label: 'Modality',     key: 'modality' },
  { label: 'Body part',    key: 'bodyPart' },
  { label: 'Study date',   key: 'studyDate', format: formatDicomDate },
  { label: 'Manufacturer', key: 'manufacturer' },
];
