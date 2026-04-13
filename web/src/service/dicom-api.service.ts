import type { DicomSource } from '../lib/utility/dicom-source.ts';
import type { LoadedStudy, StudyMetadata } from '../types/dicom.types.ts';

interface UploadResponse {
  studyId: string;
  frameCount: number;
  frameUrls: string[];
  metadata: Partial<StudyMetadata> & Record<string, string | undefined>;
}

/**
 * Server-backed DicomSource: uploads each File to the .NET backend and
 * returns absolute frame URLs prefixed with `web:` so Cornerstone's
 * registered web image loader picks them up.
 */
export function makeServerSource(baseUrl: string): DicomSource<File[]> {
  return {
    name: 'Server rendering (.NET)',

    async load(files: File[]): Promise<LoadedStudy> {
      if (files.length === 0) throw new Error('serverSource.load: no files provided');

      const sorted = [...files].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );

      const allImageIds: string[] = [];
      let firstMetadata: StudyMetadata = {};

      for (let i = 0; i < sorted.length; i++) {
        const form = new FormData();
        form.append('file', sorted[i]);
        const res = await fetch(`${baseUrl}/api/dicom/upload`, {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          throw new Error(`upload failed: ${res.status} ${res.statusText}`);
        }
        const data = (await res.json()) as UploadResponse;

        for (const rel of data.frameUrls) {
          allImageIds.push(`web:${baseUrl}${rel}`);
        }

        if (i === 0) {
          firstMetadata = {
            patientName: data.metadata.patientName,
            patientId: data.metadata.patientId,
            modality: data.metadata.modality,
            bodyPart: data.metadata.bodyPart,
            studyDate: data.metadata.studyDate,
            manufacturer: data.metadata.manufacturer,
          };
        }
      }

      return { imageIds: allImageIds, metadata: firstMetadata };
    },
  };
}
