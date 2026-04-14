export interface OrthancConfig {
  baseUrl?: string;
  auth?: string;
}

export interface PacsStudy {
  studyInstanceUID: string;
  patientName: string;
  patientId: string;
  modality: string;
  studyDate: string;
  description: string;
}

export interface PacsSeries {
  seriesInstanceUID: string; 
  studyInstanceUID: string;
  modality: string;
  numberOfInstances: number;
}
