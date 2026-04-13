# Phase 3 — Electron + Orthanc PACS Stretch Goal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Path note (post-restructure):** The monorepo now has top-level `web/`, `backend/`, and (new for this phase) `electron/`. When this plan says `electron/` it means the new sibling of `web/` and `backend/`. When it says `src/...` it's the web renderer code, now at `web/src/...`. Phase 3 may wrap web/ or live independently — decide at implementation time.

**Goal:** Package the React DICOM viewer as an Electron desktop app that polls a local [Orthanc](https://www.orthanc-server.com/) PACS server via DICOMweb (QIDO-RS to list studies, WADO-RS to fetch frames). Demonstrates the full "imaging software → Copilot" integration using real DICOM protocols — the same protocols real dental imaging vendors use.

**Architecture:** Electron shell wrapping the existing Vite React app. Main process owns all Orthanc HTTP communication (bypasses browser CORS). Polling loop fetches the study list every 2s, sends updates to the renderer over IPC. Frontend adds a third `DicomSource` implementation (`pacs-source`) and a new "PACS" mode alongside Client/Server from Phase 2. Sample DICOMs are pushed to Orthanc via its web admin UI to simulate an imaging tech importing a scan.

**Tech Stack:** Electron 32, `electron-vite` for dev pipeline, Orthanc (Docker), DICOMweb (QIDO-RS + WADO-RS) over HTTP/JSON.

**Spec:** `docs/superpowers/specs/2026-04-13-dicom-viewer-design.md` §6
**Depends on:** Phase 1 and Phase 2 plans complete.

---

## File Structure

```
copilot-hackethon/
├── electron/
│   ├── main.ts                        ← Electron main process entry
│   ├── preload.ts                     ← contextBridge IPC surface
│   ├── orthanc-client.ts              ← QIDO-RS + WADO-RS client
│   ├── orthanc-poller.ts              ← polling loop, emits study list
│   └── tsconfig.json
├── src/
│   ├── lib/
│   │   └── pacs-source.ts             ← DicomSource wrapping IPC
│   ├── components/
│   │   └── StudyList.tsx              ← left panel in PACS mode
│   ├── App.tsx                        ← modified: adds PACS mode
│   └── (Phase 1 + 2 files unchanged)
├── electron-builder.config.js         ← (optional, not required for demo)
├── docs/orthanc/
│   └── setup.md                       ← how to run Orthanc for the demo
├── package.json                       ← modified: Electron scripts + deps
└── vite.config.ts                     ← modified: electron plugin
```

**Responsibility per file:**
- `main.ts` — app lifecycle, BrowserWindow, IPC handlers. Never touches Orthanc directly.
- `orthanc-client.ts` — pure HTTP client: functions that hit QIDO-RS / WADO-RS and return typed results.
- `orthanc-poller.ts` — keeps a running `setInterval`, calls `orthanc-client`, notifies main process via a callback.
- `preload.ts` — exposes `window.pacs.*` via `contextBridge`. Only interface the renderer sees.
- `pacs-source.ts` — `DicomSource` implementation that calls `window.pacs.*`.

**CORS note:** the renderer's `pacs-source` never hits Orthanc directly. It goes through IPC → main → Orthanc. This is deliberate and is why we need Electron (vs a browser).

---

## Task 1: Install Electron + plumbing

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `electron/main.ts`, `electron/preload.ts`, `electron/tsconfig.json`

- [ ] **Step 1: Install Electron and electron-vite**

```bash
npm install --save-dev electron@32 electron-vite@2 electron-builder@25
```

- [ ] **Step 2: Update `package.json` scripts and `main` entry**

Modify `package.json` — add a `main` field and Electron scripts:
```json
{
  "name": "copilot-hackethon",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "electron:dev": "electron-vite dev",
    "electron:build": "electron-vite build",
    "electron:preview": "electron-vite preview"
  },
  "dependencies": {
    "@cornerstonejs/core": "^1.80.0",
    "@cornerstonejs/dicom-image-loader": "^1.80.0",
    "@cornerstonejs/tools": "^1.80.0",
    "dicom-parser": "^1.8.21",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "electron": "^32.2.5",
    "electron-builder": "^25.1.8",
    "electron-vite": "^2.3.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

Run `npm install` again to pick up the new scripts block.

- [ ] **Step 3: Create `electron.vite.config.ts`**

Create `electron.vite.config.ts` at the project root:
```ts
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist-electron',
      rollupOptions: { input: resolve(__dirname, 'electron/main.ts') },
    },
  },
  preload: {
    build: {
      outDir: 'dist-electron',
      rollupOptions: { input: resolve(__dirname, 'electron/preload.ts') },
    },
  },
  renderer: {
    root: '.',
    build: { outDir: 'dist' },
    plugins: [react()],
    server: { port: 5173 },
  },
});
```

- [ ] **Step 4: Create `electron/tsconfig.json`**

Create `electron/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "electron"]
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 5: Create a minimal `electron/main.ts`** (Orthanc integration comes in Task 3)

Create `electron/main.ts`:
```ts
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    backgroundColor: '#020617', // slate-950
    webPreferences: {
      preload: resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(resolve(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

- [ ] **Step 6: Create a minimal `electron/preload.ts`**

Create `electron/preload.ts`:
```ts
// Preload surface will be expanded in Task 4 to expose PACS IPC.
// For now, an empty preload keeps contextIsolation working.
```

- [ ] **Step 7: Smoke test**

```bash
npm run electron:dev
```
Expected: a native window opens showing the existing React app. Close the window.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: Electron shell wrapping the React app"
```

---

## Task 2: Document Orthanc setup

**Files:**
- Create: `docs/orthanc/setup.md`

- [ ] **Step 1: Create `docs/orthanc/setup.md`**

Create `docs/orthanc/setup.md`:
```markdown
# Orthanc setup for Phase 3

Orthanc is the simulated "imaging software" in our demo. It's a free, open-source
PACS that speaks DICOMweb (QIDO-RS, WADO-RS, STOW-RS).

## Run via Docker (recommended)

    docker run --rm -d --name copilot-orthanc \
      -p 4242:4242 -p 8042:8042 \
      jodogne/orthanc-plugins

- Port **8042** = HTTP admin UI and DICOMweb (we use this one).
- Port 4242 = classic DIMSE (not used by us but standard).

Admin UI: http://localhost:8042 (username `orthanc`, password `orthanc`).

## Smoke-test DICOMweb endpoints

    # QIDO-RS — list studies
    curl -u orthanc:orthanc 'http://localhost:8042/dicom-web/studies' | jq

    # Expect an empty array until we upload something.

## Upload a sample to simulate the "tech imports a scan" moment

1. Open http://localhost:8042
2. Click "Upload" → drag `samples/dental-pano.dcm` in.
3. Re-run the QIDO-RS curl above — the study now appears.

## Stop

    docker stop copilot-orthanc
```

- [ ] **Step 2: Start Orthanc and verify manually**

```bash
docker run --rm -d --name copilot-orthanc \
  -p 4242:4242 -p 8042:8042 \
  jodogne/orthanc-plugins
sleep 3
curl -u orthanc:orthanc 'http://localhost:8042/system' | head -c 300
```
Expected: JSON with Orthanc version info.

Upload the dental pano via the web UI at http://localhost:8042 (drag-drop), then:
```bash
curl -u orthanc:orthanc 'http://localhost:8042/dicom-web/studies' | head -c 500
```
Expected: JSON array with one study entry. Leave Orthanc running for the next tasks.

- [ ] **Step 3: Commit**

```bash
git add docs/orthanc/
git commit -m "docs: Orthanc setup and DICOMweb smoke test"
```

---

## Task 3: `orthanc-client.ts` — QIDO-RS + WADO-RS HTTP client

**Files:**
- Create: `electron/orthanc-client.ts`

- [ ] **Step 1: Create `orthanc-client.ts`**

Create `electron/orthanc-client.ts`:
```ts
/**
 * Thin HTTP client for Orthanc's DICOMweb interface.
 * All calls run in the Electron main process (no CORS).
 */

const DEFAULT_BASE = 'http://localhost:8042/dicom-web';
const DEFAULT_AUTH = 'Basic ' + Buffer.from('orthanc:orthanc').toString('base64');

export interface OrthancConfig {
  baseUrl?: string;
  auth?: string;
}

export interface PacsStudy {
  studyInstanceUID: string;
  patientName: string;
  patientId: string;
  modality: string;
  studyDate: string;
  description: string;
}

export interface PacsSeries {
  seriesInstanceUID: string;
  studyInstanceUID: string;
  modality: string;
  numberOfInstances: number;
}

/**
 * QIDO-RS: list all studies.
 * DICOMweb returns arrays of tag-keyed objects; we flatten the handful we need.
 */
export async function listStudies(cfg: OrthancConfig = {}): Promise<PacsStudy[]> {
  const baseUrl = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const res = await fetch(`${baseUrl}/studies`, {
    headers: { Authorization: auth, Accept: 'application/dicom+json' },
  });
  if (!res.ok) throw new Error(`QIDO-RS studies failed: ${res.status}`);
  const json = (await res.json()) as unknown[];
  return json.map(mapStudy);
}

/** QIDO-RS: list series for a given study. */
export async function listSeries(studyUID: string, cfg: OrthancConfig = {}): Promise<PacsSeries[]> {
  const baseUrl = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const res = await fetch(`${baseUrl}/studies/${studyUID}/series`, {
    headers: { Authorization: auth, Accept: 'application/dicom+json' },
  });
  if (!res.ok) throw new Error(`QIDO-RS series failed: ${res.status}`);
  const json = (await res.json()) as unknown[];
  return json.map((s) => mapSeries(s, studyUID));
}

/**
 * List instance UIDs for a series (used to build wado-rs frame URLs).
 * We need the InstanceUIDs to construct imageIds of the form
 * `wadors:<baseUrl>/studies/<study>/series/<series>/instances/<instance>/frames/1`
 */
export async function listInstanceUIDs(
  studyUID: string,
  seriesUID: string,
  cfg: OrthancConfig = {},
): Promise<string[]> {
  const baseUrl = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const res = await fetch(
    `${baseUrl}/studies/${studyUID}/series/${seriesUID}/instances`,
    { headers: { Authorization: auth, Accept: 'application/dicom+json' } },
  );
  if (!res.ok) throw new Error(`QIDO-RS instances failed: ${res.status}`);
  const json = (await res.json()) as Array<Record<string, unknown>>;
  return json
    .map((inst) => valueOf<string>(inst, '00080018')) // SOP Instance UID
    .filter((v): v is string => !!v);
}

/** WADO-RS: fetch the raw DICOM bytes for a specific instance. */
export async function fetchInstance(
  studyUID: string,
  seriesUID: string,
  instanceUID: string,
  cfg: OrthancConfig = {},
): Promise<ArrayBuffer> {
  const baseUrl = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const res = await fetch(
    `${baseUrl}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}`,
    {
      headers: {
        Authorization: auth,
        Accept: 'multipart/related; type="application/dicom"',
      },
    },
  );
  if (!res.ok) throw new Error(`WADO-RS instance failed: ${res.status}`);
  // Orthanc returns multipart/related; we extract the first part's body.
  const raw = await res.arrayBuffer();
  return extractFirstMultipart(raw, res.headers.get('content-type') ?? '');
}

// -------- helpers --------

function mapStudy(s: unknown): PacsStudy {
  const o = s as Record<string, unknown>;
  return {
    studyInstanceUID: valueOf<string>(o, '0020000D') ?? '',
    patientName: valueOf<string>(o, '00100010') ?? '',
    patientId: valueOf<string>(o, '00100020') ?? '',
    modality: valueOf<string>(o, '00080061') ?? valueOf<string>(o, '00080060') ?? '',
    studyDate: valueOf<string>(o, '00080020') ?? '',
    description: valueOf<string>(o, '00081030') ?? '',
  };
}

function mapSeries(s: unknown, studyUID: string): PacsSeries {
  const o = s as Record<string, unknown>;
  const instances = valueOf<number>(o, '00201209');
  return {
    seriesInstanceUID: valueOf<string>(o, '0020000E') ?? '',
    studyInstanceUID: studyUID,
    modality: valueOf<string>(o, '00080060') ?? '',
    numberOfInstances: typeof instances === 'number' ? instances : 0,
  };
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

/**
 * Parse a multipart/related response body and return the bytes of the first part.
 * DICOMweb instance retrieval returns exactly one part (the DICOM file).
 */
function extractFirstMultipart(raw: ArrayBuffer, contentType: string): ArrayBuffer {
  const boundaryMatch = /boundary=("?)([^";]+)\1/i.exec(contentType);
  if (!boundaryMatch) throw new Error('no multipart boundary in content-type');
  const boundary = '--' + boundaryMatch[2];
  const bytes = new Uint8Array(raw);
  const ascii = new TextDecoder('latin1').decode(bytes);

  const start = ascii.indexOf(boundary);
  if (start < 0) throw new Error('start boundary not found');
  // Find the blank line separating headers from body.
  const headerEnd = ascii.indexOf('\r\n\r\n', start);
  if (headerEnd < 0) throw new Error('multipart header end not found');
  const bodyStart = headerEnd + 4;
  const end = ascii.indexOf(boundary, bodyStart);
  if (end < 0) throw new Error('end boundary not found');
  // Trim trailing CRLF before end boundary.
  const bodyEnd = end - 2;
  return bytes.slice(bodyStart, bodyEnd).buffer;
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/orthanc-client.ts
git commit -m "feat(electron): Orthanc DICOMweb client (QIDO-RS + WADO-RS)"
```

---

## Task 4: IPC surface — preload + main process handlers

**Files:**
- Modify: `electron/main.ts`, `electron/preload.ts`
- Create: `src/types-pacs.ts` (shared between main and renderer)

- [ ] **Step 1: Create shared PACS types**

Create `src/types-pacs.ts`:
```ts
export interface PacsStudy {
  studyInstanceUID: string;
  patientName: string;
  patientId: string;
  modality: string;
  studyDate: string;
  description: string;
}

export interface PacsStudyLoad {
  /** Study metadata for display. */
  study: PacsStudy;
  /** imageIds (base64-data-URL form, prepared by main process). */
  imageIds: string[];
}
```

- [ ] **Step 2: Update `electron/preload.ts`**

Replace `electron/preload.ts`:
```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { PacsStudy, PacsStudyLoad } from '../src/types-pacs.ts';

contextBridge.exposeInMainWorld('pacs', {
  listStudies: (): Promise<PacsStudy[]> => ipcRenderer.invoke('pacs:list-studies'),
  loadStudy: (studyUID: string): Promise<PacsStudyLoad> =>
    ipcRenderer.invoke('pacs:load-study', studyUID),
  onStudiesChanged: (cb: (studies: PacsStudy[]) => void) => {
    const handler = (_e: unknown, studies: PacsStudy[]) => cb(studies);
    ipcRenderer.on('pacs:studies-changed', handler);
    return () => ipcRenderer.off('pacs:studies-changed', handler);
  },
});

declare global {
  interface Window {
    pacs: {
      listStudies(): Promise<PacsStudy[]>;
      loadStudy(studyUID: string): Promise<PacsStudyLoad>;
      onStudiesChanged(cb: (studies: PacsStudy[]) => void): () => void;
    };
  }
}
```

- [ ] **Step 3: Replace `electron/main.ts` with full IPC + polling**

Replace `electron/main.ts`:
```ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  listStudies,
  listSeries,
  listInstanceUIDs,
  fetchInstance,
} from './orthanc-client.ts';
import type { PacsStudyLoad } from '../src/types-pacs.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let lastStudiesJson = '[]';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    backgroundColor: '#020617',
    webPreferences: {
      preload: resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(resolve(__dirname, '../dist/index.html'));
  }
}

function startPolling() {
  const tick = async () => {
    try {
      const studies = await listStudies();
      const json = JSON.stringify(studies);
      if (json !== lastStudiesJson) {
        lastStudiesJson = json;
        mainWindow?.webContents.send('pacs:studies-changed', studies);
      }
    } catch (e) {
      // Swallow errors — Orthanc may be down; the UI shows an empty state.
      // Uncomment for debugging:
      // console.error('poll error', e);
    }
  };
  setInterval(tick, 2000);
  tick();
}

ipcMain.handle('pacs:list-studies', () => listStudies());

ipcMain.handle('pacs:load-study', async (_evt, studyUID: string): Promise<PacsStudyLoad> => {
  const [allStudies, allSeries] = await Promise.all([listStudies(), listSeries(studyUID)]);
  const study = allStudies.find((s) => s.studyInstanceUID === studyUID);
  if (!study) throw new Error(`study not found: ${studyUID}`);

  const imageIds: string[] = [];
  for (const series of allSeries) {
    const instanceUIDs = await listInstanceUIDs(studyUID, series.seriesInstanceUID);
    for (const iuid of instanceUIDs) {
      // Fetch the instance bytes in main, hand them to the renderer as a
      // base64 data URL. This sidesteps any CORS/auth concerns in the
      // renderer and matches Cornerstone's `wadouri:` scheme.
      const buf = await fetchInstance(studyUID, series.seriesInstanceUID, iuid);
      const b64 = Buffer.from(new Uint8Array(buf)).toString('base64');
      imageIds.push(`wadouri:data:application/dicom;base64,${b64}`);
    }
  }

  return { study, imageIds };
});

app.whenReady().then(() => {
  createWindow();
  startPolling();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

**Note on the data-URL approach:** we fetch DICOM bytes in main and embed them as base64. Cornerstone's dicom-image-loader accepts `data:` URLs transparently. Trade-off: memory cost for large series. For the hackathon demo with a handful of instances, it's fine. Production would stream instances and keep them in a blob cache.

- [ ] **Step 4: Verify Electron still launches**

Orthanc should already be running from Task 2. Upload a DICOM through the Orthanc UI if you haven't.

```bash
npm run electron:dev
```
Expected: Electron window opens; no errors in the dev tools console (open via View → Toggle Developer Tools). The React app hasn't been updated yet to use the PACS source, so visually nothing changes — that's Task 6.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(electron): IPC surface for PACS list and study load + polling"
```

---

## Task 5: `pacs-source.ts` — `DicomSource` via IPC

**Files:**
- Create: `src/lib/pacs-source.ts`, `tests/lib/pacs-source.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/pacs-source.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pacsSource } from '../../src/lib/pacs-source.ts';

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('pacsSource', () => {
  it('delegates to window.pacs.loadStudy and maps to LoadedStudy', async () => {
    const mockLoad = vi.fn(async () => ({
      study: {
        studyInstanceUID: '1.2.3',
        patientName: 'TestPatient',
        patientId: 'P1',
        modality: 'PX',
        studyDate: '20160330',
        description: 'pano',
      },
      imageIds: ['wadouri:data:application/dicom;base64,AAA=', 'wadouri:data:application/dicom;base64,BBB='],
    }));
    vi.stubGlobal('window', {
      ...globalThis.window,
      pacs: { loadStudy: mockLoad, listStudies: vi.fn(), onStudiesChanged: vi.fn() },
    });

    const study = await pacsSource.load('1.2.3');

    expect(mockLoad).toHaveBeenCalledWith('1.2.3');
    expect(study.imageIds).toHaveLength(2);
    expect(study.metadata.patientName).toBe('TestPatient');
    expect(study.metadata.modality).toBe('PX');
    expect(study.metadata.studyDate).toBe('20160330');
  });

  it('throws if window.pacs is not present (running outside Electron)', async () => {
    vi.stubGlobal('window', { ...globalThis.window, pacs: undefined });
    await expect(pacsSource.load('1.2.3')).rejects.toThrow(/electron/i);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test -- tests/lib/pacs-source.test.ts
```
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `pacs-source`**

Create `src/lib/pacs-source.ts`:
```ts
import type { DicomSource } from './dicom-source.ts';
import type { LoadedStudy } from '../types.ts';

/**
 * Phase 3 DicomSource: fetches a PACS study via the Electron main process,
 * which talks to Orthanc over DICOMweb. Input is the Study Instance UID.
 * Only works inside Electron — throws a clear error in a plain browser.
 */
export const pacsSource: DicomSource<string> = {
  name: 'PACS (Orthanc via DICOMweb)',

  async load(studyUID: string): Promise<LoadedStudy> {
    if (typeof window === 'undefined' || !window.pacs) {
      throw new Error('pacsSource requires Electron — window.pacs is unavailable');
    }
    const { study, imageIds } = await window.pacs.loadStudy(studyUID);
    return {
      imageIds,
      metadata: {
        patientName: study.patientName || undefined,
        patientId: study.patientId || undefined,
        modality: study.modality || undefined,
        bodyPart: undefined, // QIDO-RS study-level doesn't include body part
        studyDate: study.studyDate || undefined,
        manufacturer: undefined,
      },
    };
  },
};
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm test -- tests/lib/pacs-source.test.ts
```
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: pacsSource DicomSource via Electron IPC"
```

---

## Task 6: `StudyList` component + wire PACS mode into `App.tsx`

**Files:**
- Create: `src/components/StudyList.tsx`
- Modify: `src/components/ModeToggle.tsx`, `src/components/Toolbar.tsx`, `src/App.tsx`

- [ ] **Step 1: Extend `ModeToggle` to include a PACS option**

Replace `src/components/ModeToggle.tsx`:
```tsx
export type RenderMode = 'client' | 'server' | 'pacs';

const LABELS: Record<RenderMode, string> = {
  client: 'Client',
  server: 'Server',
  pacs: 'PACS',
};

interface Props {
  mode: RenderMode;
  onChange: (mode: RenderMode) => void;
  /** PACS mode is only available in Electron. */
  pacsAvailable: boolean;
}

export function ModeToggle({ mode, onChange, pacsAvailable }: Props) {
  const modes: RenderMode[] = pacsAvailable ? ['client', 'server', 'pacs'] : ['client', 'server'];
  return (
    <div className="inline-flex rounded-md border border-slate-700 bg-slate-800 text-xs overflow-hidden">
      {modes.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1.5 ${mode === m ? 'bg-accent text-slate-950' : 'text-slate-300 hover:bg-slate-700'}`}
        >
          {LABELS[m]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `StudyList` component**

Create `src/components/StudyList.tsx`:
```tsx
import type { PacsStudy } from '../types-pacs.ts';

interface Props {
  studies: PacsStudy[];
  selectedUID: string | null;
  onSelect: (uid: string) => void;
}

export function StudyList({ studies, selectedUID, onSelect }: Props) {
  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-900/40 overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-wider text-slate-500">PACS studies</h2>
        <p className="text-xs text-slate-600 mt-1">{studies.length} available</p>
      </div>
      {studies.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">
          No studies yet. Upload a DICOM file to Orthanc at{' '}
          <a className="text-accent" href="http://localhost:8042" target="_blank" rel="noreferrer">
            localhost:8042
          </a>
          .
        </div>
      ) : (
        <ul>
          {studies.map((s) => (
            <li
              key={s.studyInstanceUID}
              onClick={() => onSelect(s.studyInstanceUID)}
              className={`px-4 py-3 border-b border-slate-800 cursor-pointer text-sm
                ${selectedUID === s.studyInstanceUID ? 'bg-accent/10' : 'hover:bg-slate-800/60'}`}
            >
              <div className="text-slate-200 truncate">{s.patientName || '(no name)'}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {s.modality} · {formatDate(s.studyDate)}
              </div>
              {s.description && (
                <div className="text-xs text-slate-500 mt-0.5 truncate">{s.description}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || '—';
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
```

- [ ] **Step 3: Update `Toolbar` to pass `pacsAvailable`**

Modify `src/components/Toolbar.tsx` — change the import and the `ModeToggle` usage:

Replace the import:
```tsx
import { ModeToggle, type RenderMode } from './ModeToggle.tsx';
```

Change the Props interface — add `pacsAvailable`:
```tsx
interface Props {
  onFiles: (files: File[]) => void;
  onReset: () => void;
  onToggleMetadata: () => void;
  metadataOpen: boolean;
  studyName: string | null;
  mode: RenderMode;
  onModeChange: (m: RenderMode) => void;
  pacsAvailable: boolean;
}
```

In the component body, destructure `pacsAvailable` and pass it:
```tsx
export function Toolbar({
  onFiles, onReset, onToggleMetadata, metadataOpen, studyName, mode, onModeChange, pacsAvailable,
}: Props) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-slate-800 bg-slate-950">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold tracking-tight shrink-0">
          Copilot — <span className="text-accent">DICOM</span>
        </span>
        {studyName && (
          <span className="text-xs text-slate-500 truncate">· {studyName}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle mode={mode} onChange={onModeChange} pacsAvailable={pacsAvailable} />
        <FileDropZone onFiles={onFiles} compact />
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700"
        >
          Close
        </button>
        <button
          onClick={onToggleMetadata}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            metadataOpen
              ? 'bg-accent text-slate-950 border-accent'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
          }`}
        >
          Metadata
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Update `App.tsx` to handle PACS mode**

Replace `src/App.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fileSource } from './lib/file-source.ts';
import { makeServerSource } from './lib/server-source.ts';
import { pacsSource } from './lib/pacs-source.ts';
import type { LoadedStudy } from './types.ts';
import type { PacsStudy } from './types-pacs.ts';
import { FileDropZone } from './components/FileDropZone.tsx';
import { DicomViewer } from './components/DicomViewer.tsx';
import { SliceScrubber } from './components/SliceScrubber.tsx';
import { MetadataPanel } from './components/MetadataPanel.tsx';
import { Toolbar } from './components/Toolbar.tsx';
import { StudyList } from './components/StudyList.tsx';
import type { RenderMode } from './components/ModeToggle.tsx';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:5000';
const serverSource = makeServerSource(SERVER_URL);
const pacsAvailable = typeof window !== 'undefined' && !!window.pacs;

export default function App() {
  const [mode, setMode] = useState<RenderMode>(pacsAvailable ? 'pacs' : 'client');
  const [study, setStudy] = useState<LoadedStudy | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(true);
  const [studyName, setStudyName] = useState<string | null>(null);

  // PACS mode state
  const [pacsStudies, setPacsStudies] = useState<PacsStudy[]>([]);
  const [selectedPacsUID, setSelectedPacsUID] = useState<string | null>(null);

  // Subscribe to Orthanc polling updates
  useEffect(() => {
    if (!pacsAvailable) return;
    window.pacs.listStudies().then(setPacsStudies).catch(() => { /* initial empty */ });
    return window.pacs.onStudiesChanged(setPacsStudies);
  }, []);

  const loadPacsStudy = useCallback(async (studyUID: string) => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await pacsSource.load(studyUID);
      setStudy(loaded);
      setCurrentIndex(0);
      setSelectedPacsUID(studyUID);
      const pacs = pacsStudies.find((s) => s.studyInstanceUID === studyUID);
      setStudyName(pacs?.patientName || studyUID);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [pacsStudies]);

  const onFiles = useCallback(async (files: File[]) => {
    if (mode === 'pacs') return; // PACS mode doesn't use file upload
    setLoading(true);
    setError(null);
    try {
      const source = mode === 'client' ? fileSource : serverSource;
      const loaded = await source.load(files);
      setStudy(loaded);
      setCurrentIndex(0);
      setStudyName(files.length === 1 ? files[0].name : `${files.length} slices`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const onReset = useCallback(() => {
    if (study) {
      for (const id of study.imageIds) {
        if (id.startsWith('wadouri:blob:')) {
          URL.revokeObjectURL(id.replace(/^wadouri:/, ''));
        }
      }
    }
    setStudy(null);
    setCurrentIndex(0);
    setStudyName(null);
    setSelectedPacsUID(null);
    setError(null);
  }, [study]);

  const onModeChange = useCallback((m: RenderMode) => {
    setMode(m);
    onReset();
  }, [onReset]);

  const content = useMemo(() => {
    if (mode === 'pacs') {
      return (
        <div className="flex-1 flex min-h-0">
          <StudyList studies={pacsStudies} selectedUID={selectedPacsUID} onSelect={loadPacsStudy} />
          <div className="flex-1 flex flex-col min-w-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
            ) : !study ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-8 text-center">
                {error ?? 'Select a study from the list to view it.'}
              </div>
            ) : (
              <>
                <DicomViewer
                  imageIds={study.imageIds}
                  currentIndex={currentIndex}
                  onIndexChange={setCurrentIndex}
                />
                <SliceScrubber
                  total={study.imageIds.length}
                  current={currentIndex}
                  onChange={setCurrentIndex}
                />
              </>
            )}
          </div>
          {metadataOpen && study && <MetadataPanel metadata={study.metadata} />}
        </div>
      );
    }

    // client/server modes = file-upload flow (Phase 1/2)
    if (loading) {
      return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
    }
    if (!study) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <FileDropZone onFiles={onFiles} />
            {error && <div className="mt-4 text-sm text-red-400">{error}</div>}
            <div className="mt-4 text-center text-xs text-slate-500">
              Rendering mode: <span className="text-slate-300">{mode}</span>
              {mode === 'server' && <> — backend must be running at <code>{SERVER_URL}</code></>}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <DicomViewer
            imageIds={study.imageIds}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
          />
          <SliceScrubber
            total={study.imageIds.length}
            current={currentIndex}
            onChange={setCurrentIndex}
          />
        </div>
        {metadataOpen && <MetadataPanel metadata={study.metadata} />}
      </div>
    );
  }, [mode, loading, study, error, onFiles, currentIndex, metadataOpen, pacsStudies, selectedPacsUID, loadPacsStudy]);

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        onFiles={onFiles}
        onReset={onReset}
        onToggleMetadata={() => setMetadataOpen((o) => !o)}
        metadataOpen={metadataOpen}
        studyName={studyName}
        mode={mode}
        onModeChange={onModeChange}
        pacsAvailable={pacsAvailable}
      />
      {content}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: PACS mode with StudyList and Electron polling"
```

---

## Task 7: End-to-end smoke test

**Files:** none

- [ ] **Step 1: Ensure Orthanc is running**

```bash
docker ps | grep copilot-orthanc || \
  docker run --rm -d --name copilot-orthanc -p 4242:4242 -p 8042:8042 jodogne/orthanc-plugins
```

- [ ] **Step 2: Launch Electron**

```bash
npm run electron:dev
```
Expected: Electron window opens; mode toggle shows Client/Server/PACS; defaults to PACS.

- [ ] **Step 3: Simulate the "tech imports a scan"**

In a browser, go to http://localhost:8042 (creds: `orthanc` / `orthanc`). Click "Upload" → drag `samples/dental-pano.dcm` in.

Within 2 seconds, the study should appear in the Copilot study list (left panel).

- [ ] **Step 4: Click the study**

Expected: dental pano renders in the viewport. Metadata panel shows patient/modality/date. No slice scrubber (single frame).

- [ ] **Step 5: Test with the MRI series**

In Orthanc UI, upload all files from `samples/mri-knee/series-000001/`. Orthanc groups them by SeriesInstanceUID.

Expected: A new study appears. Click it → MRI slices render; scrubber appears; wheel-scroll works.

- [ ] **Step 6: Regression check — other modes still work**

Toggle to **Client**. Close Orthanc (optional). Drop a local `.dcm` file. Expected: renders via Phase 1 path.

Toggle to **Server** (with backend running on :5000). Drop a local `.dcm` file. Expected: renders via Phase 2 path.

- [ ] **Step 7: Clean up**

```bash
docker stop copilot-orthanc
```

- [ ] **Step 8: Commit any final fixes**

```bash
git status
# Commit any tweaks if needed
```

---

## Task 8: Final documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Electron + PACS section to `README.md`**

Append to `README.md`:
```markdown
## Electron app + Orthanc PACS (Phase 3 stretch)

Simulates the full sensor → imaging software → Copilot flow using Orthanc as
the simulated imaging software/PACS.

### Start Orthanc

See [docs/orthanc/setup.md](docs/orthanc/setup.md).

### Run the Electron app

    npm run electron:dev

The app polls Orthanc every 2 seconds. Upload a DICOM to Orthanc's web UI at
http://localhost:8042 and watch it appear in the Copilot study list.

### What protocols are used

- **QIDO-RS** to list studies and series
- **WADO-RS** to fetch DICOM instances
- All HTTP; no DIMSE TCP. Matches how modern dental imaging software works.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: Phase 3 Electron + Orthanc usage"
```

---

## Done criteria for Phase 3

- [ ] Orthanc can be started via documented Docker command
- [ ] `npm run electron:dev` launches the app successfully
- [ ] PACS mode shows studies uploaded to Orthanc within 2-3 seconds
- [ ] Selecting a dental pano study renders it correctly
- [ ] Selecting an MRI series study renders with a working scrubber
- [ ] Client and Server modes still work (regression)
- [ ] No CORS errors (all Orthanc traffic goes through main process)
- [ ] `npm test` passes (all tests including `pacs-source` mocked)

---

## Emergency fallback — NOT in scope

If Orthanc proves unusable on the demo machine within ~24h of the demo,
fall back to a folder watcher per spec §6. This is NOT planned work — do
not build it unless that emergency materializes.

---

## Self-Review Notes

**Spec coverage (§6):**
- Electron wraps the Phase 1/2 app: Task 1 ✓
- Orthanc simulating imaging software (Docker one-liner): Task 2 ✓
- QIDO-RS for study list: Task 3 + Task 4 polling ✓
- WADO-RS for instance retrieval: Task 3 + Task 4 ✓
- All HTTP in Electron main process (no CORS in renderer): Task 4 ✓
- 2s polling loop: Task 4 ✓
- Demo script works: Task 7 ✓
- Reuses Phase 1 viewer unchanged: Task 5/6 ✓
- `pacs-source` satisfies `DicomSource`: Task 5 ✓
- Folder-watcher is emergency-only and not built: explicit note above ✓

**Placeholder scan:** None.

**Type consistency:** `PacsStudy`, `PacsSeries`, `PacsStudyLoad`, `RenderMode`, `pacsSource`, `window.pacs` surface — consistent across `electron/` and `src/`.

**Known limitation:** base64 data-URL transport in `pacs:load-study` is memory-heavy for large series. Acceptable for hackathon demos with ≤30 slices; documented as a production concern.
