import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeServerSource } from '../../src/service/dicom-api.service.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('serverSource', () => {
  it('POSTs each file and prefixes frame URLs with web: for cornerstone', async () => {
    const fetchSpy = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          studyId: 'aaa',
          frameCount: 1,
          frameUrls: ['/api/dicom/aaa/frame/0'],
          metadata: { modality: 'PX', bodyPart: 'Jaw region' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchSpy);

    const src = makeServerSource('http://localhost:5000');
    const file = new File([new Uint8Array([1, 2, 3])], 'a.dcm');

    const study = await src.load([file]);

    expect(study.imageIds).toEqual(['web:http://localhost:5000/api/dicom/aaa/frame/0']);
    expect(study.metadata.modality).toBe('PX');
    expect(study.metadata.bodyPart).toBe('Jaw region');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('handles multiple files; metadata taken from the first', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        call++;
        return new Response(
          JSON.stringify({
            studyId: `id-${call}`,
            frameCount: 1,
            frameUrls: [`/api/dicom/id-${call}/frame/0`],
            metadata: { modality: 'MR' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );

    const src = makeServerSource('http://localhost:5000');
    const files = [
      new File([new Uint8Array([1])], '1.dcm'),
      new File([new Uint8Array([2])], '2.dcm'),
    ];
    const study = await src.load(files);

    expect(study.imageIds).toHaveLength(2);
    expect(study.imageIds[0]).toMatch(/^web:http:\/\/localhost:5000\/api\/dicom\/id-\d\/frame\/0$/);
    expect(study.metadata.modality).toBe('MR');
  });

  it('rejects when given no files', async () => {
    const src = makeServerSource('http://localhost:5000');
    await expect(src.load([])).rejects.toThrow(/no files/i);
  });

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const src = makeServerSource('http://localhost:5000');
    await expect(src.load([new File([new Uint8Array([1])], 'a.dcm')])).rejects.toThrow();
  });
});
