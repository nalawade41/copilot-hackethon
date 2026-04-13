import { expect } from 'vitest';
import type { DicomSource } from '../../src/lib/utility/dicom-source.ts';

/**
 * Shared contract that every DicomSource implementation must satisfy.
 * Called from per-implementation test files.
 */
export async function runDicomSourceContract<T>(
  source: DicomSource<T>,
  makeInput: () => Promise<T> | T,
  expectedImageIdCount: number,
): Promise<void> {
  const input = await makeInput();
  const study = await source.load(input);

  expect(study.imageIds.length).toBe(expectedImageIdCount);
  for (const id of study.imageIds) {
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  }
  expect(study.metadata).toBeDefined();
}
