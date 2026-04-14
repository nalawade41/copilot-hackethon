import type { OrthancConfig } from './orthanc/types';

const ORTHANC_URL = process.env.ORTHANC_URL ?? 'http://localhost:8042';
const ORTHANC_USER = process.env.ORTHANC_USER ?? 'orthanc';
const ORTHANC_PASSWORD = process.env.ORTHANC_PASSWORD ?? 'orthanc';

export const ORTHANC_CFG: OrthancConfig = {
  baseUrl: `${ORTHANC_URL}/dicom-web`,
  auth: 'Basic ' + Buffer.from(`${ORTHANC_USER}:${ORTHANC_PASSWORD}`).toString('base64'),
};

export const DEV_URL = 'http://localhost:5173';
