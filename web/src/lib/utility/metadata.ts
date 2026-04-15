import dicomParser from 'dicom-parser';
import type { StudyMetadata } from '../../types/dicom.types.ts';

const EMPTY: StudyMetadata = {
  patientName: undefined,
  patientId: undefined,
  modality: undefined,
  bodyPart: undefined,
  studyDate: undefined,
  manufacturer: undefined,
  studyDescription: undefined,
};

/**
 * Extract a fixed set of DICOM tags from an in-memory DICOM ArrayBuffer.
 * Returns all-undefined fields on parse failure rather than throwing.
 */
export function extractMetadata(buffer: ArrayBuffer): StudyMetadata {
  let dataSet: dicomParser.DataSet;
  try {
    dataSet = dicomParser.parseDicom(new Uint8Array(buffer));
  } catch {
    return { ...EMPTY };
  }

  const s = (tag: string) => {
    const v = dataSet.string(tag);
    return v && v.trim() !== '' ? v.trim() : undefined;
  };

  return {
    patientName: s('x00100010'),
    patientId: s('x00100020'),
    modality: s('x00080060'),
    bodyPart: s('x00180015'),
    studyDate: s('x00080020'),
    manufacturer: s('x00080070'),
    studyDescription: s('x00081030'),
  };
}
