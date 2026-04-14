export interface PacsStudy {
  studyInstanceUID: string;
  patientName: string;
  patientId: string;
  modality: string;
  studyDate: string;
  description: string;
}

export interface PacsStudyLoad {
  study: PacsStudy;
  imageIds: string[];
}

export interface PacsApi {
  listStudies(): Promise<PacsStudy[]>;
  loadStudy(studyUID: string): Promise<PacsStudyLoad>;
  onStudiesChanged(cb: (studies: PacsStudy[]) => void): () => void;
  onConnectionError(cb: (message: string) => void): () => void;
}
