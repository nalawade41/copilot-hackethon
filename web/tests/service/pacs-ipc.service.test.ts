import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pacsSource } from '../../src/service/pacs-ipc.service.ts';

beforeEach(() => { vi.unstubAllGlobals(); });

describe('pacsSource', () => {
  it('delegates to window.pacs.loadStudy', async () => {
    const mockLoad = vi.fn(async () => ({
      study: { studyInstanceUID: '1.2.3', patientName: 'Test', patientId: 'P1', modality: 'PX', studyDate: '20160330', description: '' },
      imageIds: ['wadouri:data:application/dicom;base64,AAA='],
    }));
    vi.stubGlobal('window', { ...globalThis.window, pacs: { loadStudy: mockLoad, listStudies: vi.fn(), onStudiesChanged: vi.fn(), onConnectionError: vi.fn() } });

    const study = await pacsSource.load('1.2.3');
    expect(mockLoad).toHaveBeenCalledWith('1.2.3');
    expect(study.imageIds).toHaveLength(1);
    expect(study.metadata.modality).toBe('PX');
  });

  it('throws when window.pacs is not present', async () => {
    vi.stubGlobal('window', { ...globalThis.window, pacs: undefined });
    await expect(pacsSource.load('1.2.3')).rejects.toThrow(/electron/i);
  });
});
