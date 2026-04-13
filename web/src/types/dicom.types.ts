/** Fields extracted from DICOM tags for the metadata panel. */
export interface StudyMetadata {
  patientName?: string;
  patientId?: string;
  modality?: string;
  bodyPart?: string;
  studyDate?: string;
  manufacturer?: string;
}

/** Result of loading one or more DICOM files. */
export interface LoadedStudy {
  /** Ordered list of Cornerstone imageIds, one per frame/slice. */
  imageIds: string[];
  /** Metadata extracted from the first image in the study. */
  metadata: StudyMetadata;
}
