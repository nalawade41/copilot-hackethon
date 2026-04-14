import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStudies, listSeries, listInstanceUIDs, fetchInstance } from '../../src/orthanc/client';

const BASE = { baseUrl: 'http://orthanc.test/dicom-web', auth: 'Basic xxx' };

beforeEach(() => { vi.restoreAllMocks(); });

describe('orthanc-client', () => {
  it('listStudies flattens QIDO-RS JSON into PacsStudy[]', async () => {
    const fake = [{ '0020000D': { Value: ['1.2.3'] }, '00100010': { Value: [{ Alphabetic: 'Doe^John' }] }, '00100020': { Value: ['P1'] }, '00080060': { Value: ['PX'] }, '00080020': { Value: ['20160330'] }, '00081030': { Value: ['pano'] } }];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fake), { status: 200, headers: { 'content-type': 'application/dicom+json' } })));
    const studies = await listStudies(BASE);
    expect(studies).toHaveLength(1);
    expect(studies[0].studyInstanceUID).toBe('1.2.3');
    expect(studies[0].patientName).toBe('Doe^John');
    expect(studies[0].modality).toBe('PX');
  });

  it('listSeries includes studyInstanceUID', async () => {
    const fake = [{ '0020000E': { Value: ['1.2.3.1'] }, '00080060': { Value: ['PX'] }, '00201209': { Value: [1] } }];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fake), { status: 200, headers: { 'content-type': 'application/dicom+json' } })));
    const series = await listSeries('1.2.3', BASE);
    expect(series[0].studyInstanceUID).toBe('1.2.3');
    expect(series[0].seriesInstanceUID).toBe('1.2.3.1');
  });

  it('listInstanceUIDs returns SOP Instance UIDs', async () => {
    const fake = [{ '00080018': { Value: ['1.2.3.1.1'] } }, { '00080018': { Value: ['1.2.3.1.2'] } }];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fake), { status: 200, headers: { 'content-type': 'application/dicom+json' } })));
    const uids = await listInstanceUIDs('1.2.3', '1.2.3.1', BASE);
    expect(uids).toEqual(['1.2.3.1.1', '1.2.3.1.2']);
  });

  it('fetchInstance extracts first multipart body', async () => {
    const bodyBytes = new Uint8Array([0x44, 0x49, 0x43, 0x4d]);
    const boundary = 'mime-boundary-123';
    const multipart = [`--${boundary}`, 'Content-Type: application/dicom', '', new TextDecoder('latin1').decode(bodyBytes), `--${boundary}--`, ''].join('\r\n');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(multipart, { status: 200, headers: { 'content-type': `multipart/related; boundary="${boundary}"; type="application/dicom"` } })));
    const buf = await fetchInstance('1.2.3', '1.2.3.1', '1.2.3.1.1', BASE);
    expect(Array.from(new Uint8Array(buf).slice(0, 4))).toEqual([0x44, 0x49, 0x43, 0x4d]);
  });

  it('throws on non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(listStudies(BASE)).rejects.toThrow(/500/);
  });
});
