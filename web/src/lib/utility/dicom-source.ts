import type { LoadedStudy } from '../../types/dicom.types.ts';

/**
 * A DicomSource turns some input (browser Files, a server response, a PACS URL,
 * etc.) into a LoadedStudy the viewer can render.
 */
export interface DicomSource<TInput> {
  readonly name: string;
  load(input: TInput): Promise<LoadedStudy>;
}
