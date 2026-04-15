import type { DicomSource } from '../lib/utility/dicom-source.ts';
import type { LoadedStudy } from '../types';

export const pacsSource: DicomSource<string> = {
  name: 'PACS (Orthanc via DICOMweb)',

  async load(studyUID: string): Promise<LoadedStudy> {
    if (typeof window === 'undefined' || !window.pacs) {
      throw new Error('pacsSource requires Electron — window.pacs is unavailable');
    }
    const { study, imageIds } = await window.pacs.loadStudy(studyUID);
    return {
      imageIds,
      metadata: {
        patientName: study.patientName || undefined,
        patientId: study.patientId || undefined,
        modality: study.modality || undefined,
        bodyPart: undefined,
        studyDate: study.studyDate || undefined,
        manufacturer: undefined,
        // Empty description in PACS almost always means the study was
        // uploaded directly via DICOMweb (the push protocols tag their
        // descriptions). Surface that to the user instead of showing "—".
        studyDescription: study.description || '[DICOMweb (Poll)]',
      },
    };
  },
};
