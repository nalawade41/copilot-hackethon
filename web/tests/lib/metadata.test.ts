import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractMetadata } from '../../src/lib/utility/metadata.ts';

describe('extractMetadata', () => {
  it('extracts dental pano fields from a real DICOM ArrayBuffer', () => {
    const buf = readFileSync(resolve(__dirname, '../../../samples/dental-pano.dcm'));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    const meta = extractMetadata(ab as ArrayBuffer);

    expect(meta.modality).toBe('PX');
    expect(meta.bodyPart).toMatch(/jaw/i);
    expect(meta.manufacturer).toMatch(/instrumentarium/i);
    expect(meta.studyDate).toBe('20160330');
  });

  it('returns an object with undefined fields for a buffer with no DICOM preamble', () => {
    const empty = new ArrayBuffer(200);
    const meta = extractMetadata(empty);
    expect(meta).toEqual({
      patientName: undefined,
      patientId: undefined,
      modality: undefined,
      bodyPart: undefined,
      studyDate: undefined,
      manufacturer: undefined,
    });
  });
});
