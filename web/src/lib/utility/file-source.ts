import type { DicomSource } from './dicom-source.ts';
import type { LoadedStudy } from '../../types/dicom.types.ts';
import { extractMetadata } from './metadata.ts';

/**
 * Browser-file DicomSource: accepts an array of File objects and produces
 * one `wadouri:<blob-url>` imageId per file. Metadata is extracted from the
 * first file.
 */
export const fileSource: DicomSource<File[]> = {
  name: 'Local files',

  async load(files: File[]): Promise<LoadedStudy> {
    if (files.length === 0) {
      throw new Error('fileSource.load: no files provided');
    }

    const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    );

    const imageIds = sorted.map((f) => `wadouri:${URL.createObjectURL(f)}`);
    const firstBuffer = await sorted[0].arrayBuffer();
    const metadata = extractMetadata(firstBuffer);

    return { imageIds, metadata };
  },
};
