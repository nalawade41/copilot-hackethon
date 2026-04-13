import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileSource } from '../../src/lib/utility/file-source.ts';
import { runDicomSourceContract } from './dicom-source-contract.ts';

function loadSample(relative: string): File {
  const buf = readFileSync(resolve(__dirname, '../../../', relative));
  // Create a File from the buffer
  const file = new File([buf], relative.split('/').pop()!, { type: 'application/dicom' });

  // Ensure arrayBuffer() method exists (polyfill for jsdom)
  if (!file.arrayBuffer) {
    Object.defineProperty(file, 'arrayBuffer', {
      value: async function() {
        return new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(this);
        });
      },
    });
  }

  return file;
}

beforeAll(() => {
  // jsdom supports URL.createObjectURL only partially; stub for determinism.
  let counter = 0;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => `blob:mock/${counter++}`,
    revokeObjectURL: () => undefined,
  });
});

describe('fileSource', () => {
  it('produces one wadouri imageId for a single file', async () => {
    const file = loadSample('samples/dental-pano.dcm');
    const study = await fileSource.load([file]);
    expect(study.imageIds).toHaveLength(1);
    expect(study.imageIds[0]).toMatch(/^wadouri:blob:/);
    expect(study.metadata.modality).toBe('PX');
  });

  it('produces N imageIds for N files, metadata from the first', async () => {
    const files = [
      loadSample('samples/mri-knee/series-000001/image-000001.dcm'),
      loadSample('samples/mri-knee/series-000001/image-000002.dcm'),
      loadSample('samples/mri-knee/series-000001/image-000003.dcm'),
    ];
    const study = await fileSource.load(files);
    expect(study.imageIds).toHaveLength(3);
    for (const id of study.imageIds) {
      expect(id).toMatch(/^wadouri:blob:/);
    }
    expect(study.metadata.modality).toBe('MR');
  });

  it('satisfies the shared DicomSource contract', async () => {
    await runDicomSourceContract(
      fileSource,
      () => [loadSample('samples/dental-pano.dcm')],
      1,
    );
  });

  it('rejects when given no files', async () => {
    await expect(fileSource.load([])).rejects.toThrow(/no files/i);
  });
});
