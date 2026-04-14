/// <reference types="vite/client" />

import type { PacsApi } from './types/pacs.types';

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    /** Exposed by Electron preload. `undefined` in plain browser. */
    pacs?: PacsApi;
  }
}

export {};
