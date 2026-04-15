import type { OrthancConfig, PacsStudy, PacsSeries } from './types';

const DEFAULT_BASE = 'http://localhost:8042/dicom-web';
const DEFAULT_AUTH = 'Basic ' + Buffer.from('orthanc:orthanc').toString('base64');

function headers(auth: string) {
  return { Authorization: auth, Accept: 'application/dicom+json' };
}

async function getJson<T>(url: string, auth: string): Promise<T> {
  const res = await fetch(url, { headers: headers(auth) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

function valueOf<T>(obj: Record<string, unknown>, tag: string): T | undefined {
  const node = obj[tag] as { Value?: unknown[] } | undefined;
  const v = node?.Value?.[0];
  if (v === undefined) return undefined;
  if (typeof v === 'object' && v !== null && 'Alphabetic' in v) {
    return (v as { Alphabetic: T }).Alphabetic;
  }
  return v as T;
}

function mapStudy(raw: unknown): PacsStudy {
  const o = raw as Record<string, unknown>;
  return {
    studyInstanceUID: valueOf<string>(o, '0020000D') ?? '',
    patientName: valueOf<string>(o, '00100010') ?? '',
    patientId: valueOf<string>(o, '00100020') ?? '',
    modality: valueOf<string>(o, '00080061') ?? valueOf<string>(o, '00080060') ?? '',
    studyDate: valueOf<string>(o, '00080020') ?? '',
    description: valueOf<string>(o, '00081030') ?? '',
  };
}

function mapSeries(raw: unknown, studyUID: string): PacsSeries {
  const o = raw as Record<string, unknown>;
  const n = valueOf<number>(o, '00201209');
  return {
    seriesInstanceUID: valueOf<string>(o, '0020000E') ?? '',
    studyInstanceUID: studyUID,
    modality: valueOf<string>(o, '00080060') ?? '',
    numberOfInstances: typeof n === 'number' ? n : 0,
  };
}

export async function listStudies(cfg: OrthancConfig = {}): Promise<PacsStudy[]> {
  const base = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  // includefield=00081030 → ask Orthanc to return StudyDescription
  // (QIDO-RS returns a default tag set; non-default tags must be requested)
  const arr = await getJson<unknown[]>(`${base}/studies?includefield=00081030`, auth);
  return arr.map(mapStudy);
}

export async function listSeries(studyUID: string, cfg: OrthancConfig = {}): Promise<PacsSeries[]> {
  const base = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const arr = await getJson<unknown[]>(`${base}/studies/${studyUID}/series`, auth);
  return arr.map((r) => mapSeries(r, studyUID));
}

export async function listInstanceUIDs(
  studyUID: string,
  seriesUID: string,
  cfg: OrthancConfig = {},
): Promise<string[]> {
  const base = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const arr = await getJson<Array<Record<string, unknown>>>(
    `${base}/studies/${studyUID}/series/${seriesUID}/instances`,
    auth,
  );
  return arr.map((inst) => valueOf<string>(inst, '00080018')).filter((v): v is string => !!v);
}

export async function fetchInstance(
  studyUID: string,
  seriesUID: string,
  instanceUID: string,
  cfg: OrthancConfig = {},
): Promise<ArrayBuffer> {
  const base = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const res = await fetch(
    `${base}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}`,
    {
      headers: {
        Authorization: auth,
        Accept: 'multipart/related; type="application/dicom"',
      },
    },
  );
  if (!res.ok) throw new Error(`fetchInstance → ${res.status}`);
  const raw = await res.arrayBuffer();
  return extractFirstMultipart(raw, res.headers.get('content-type') ?? '');
}

function extractFirstMultipart(raw: ArrayBuffer, contentType: string): ArrayBuffer {
  const m = /boundary=("?)([^";]+)\1/i.exec(contentType);
  if (!m) throw new Error('no multipart boundary in content-type');
  const boundary = '--' + m[2];
  const bytes = new Uint8Array(raw);
  const ascii = new TextDecoder('latin1').decode(bytes);
  const start = ascii.indexOf(boundary);
  if (start < 0) throw new Error('start boundary not found');
  const headerEnd = ascii.indexOf('\r\n\r\n', start);
  if (headerEnd < 0) throw new Error('multipart header end not found');
  const bodyStart = headerEnd + 4;
  const end = ascii.indexOf(boundary, bodyStart);
  if (end < 0) throw new Error('end boundary not found');
  const bodyEnd = end - 2;
  return bytes.slice(bodyStart, bodyEnd).buffer;
}
