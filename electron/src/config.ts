import type { OrthancConfig } from './orthanc/types';

// Fallback is the PRODUCTION gateway because .env is NOT bundled into the
// packaged app — dotenv finds nothing there and the fallback kicks in.
// Local dev still reads electron/.env (via dotenv/config in main.ts), so
// developers pointing at a local Orthanc keep working unchanged.
const ORTHANC_URL =
  process.env.ORTHANC_URL ?? 'https://copilot-hackethon-production.up.railway.app';
const ORTHANC_USER = process.env.ORTHANC_USER ?? '';
const ORTHANC_PASSWORD = process.env.ORTHANC_PASSWORD ?? '';

export const ORTHANC_CFG: OrthancConfig = {
  baseUrl: `${ORTHANC_URL}/dicom-web`,
  auth: 'Basic ' + Buffer.from(`${ORTHANC_USER}:${ORTHANC_PASSWORD}`).toString('base64'),
};

export const DEV_URL = 'http://localhost:5173';
