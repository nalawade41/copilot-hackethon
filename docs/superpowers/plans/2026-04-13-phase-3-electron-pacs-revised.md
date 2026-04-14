# Phase 3 — Electron + Orthanc PACS (revised) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Owner-preference note:** All `git commit` / `git push` steps in this plan are SKIPPED — the repo owner commits manually. Agents executing this plan must not commit or push on their own. You may run `git status`, `git add` (staging), and all tests/dev servers freely.

**Goal:** Ship an Electron desktop app (Mac + Windows) that reuses the `web/` React codebase and adds a third "PACS" sidebar item. PACS mode pulls studies from a local Orthanc server via DICOMweb (QIDO-RS + WADO-RS), all HTTP flowing through Electron's main process to sidestep browser CORS.

**Architecture:** Single React codebase in `web/src/`. Runtime feature flag via `window.pacs` (set by Electron's preload, absent in browser) reveals the PACS sidebar item only inside Electron. Electron main process owns Orthanc HTTP + 2-second polling + IPC bridge. Renderer consumes PACS data through an IPC-backed `DicomSource` that plugs into the existing `DicomViewer`.

**Tech Stack:** Electron 32, `electron-vite` 2, `electron-builder` 25, Node fetch, React 18 / Vite 5 (unchanged from `web/`), Cornerstone3D v2 (unchanged), Orthanc via Docker, Vitest for tests.

**Spec:** [docs/superpowers/specs/2026-04-13-phase-3-electron-pacs-revised-design.md](../specs/2026-04-13-phase-3-electron-pacs-revised-design.md)
**Supersedes plan:** `docs/superpowers/plans/2026-04-13-phase-3-electron-orthanc.md` (kept for reference)
**Depends on:** Phase 1 (web viewer) and Phase 2 (.NET backend) — both completed.

---

## File Structure

### New — `electron/` (repo-root sibling of `web/` and `backend/`)

```
electron/
├── package.json                   # Electron-only deps + scripts
├── tsconfig.json                  # TS config for main/preload/tests
├── electron.vite.config.ts        # main + preload + renderer config
├── vitest.config.ts               # vitest for electron-side tests
├── .env                           # ORTHANC_URL=http://localhost:8042 default
├── .env.example                   # committed template
├── README.md                      # dev instructions
├── main.ts                        # BrowserWindow, IPC handlers, app lifecycle
├── preload.ts                     # contextBridge → window.pacs
├── orthanc-client.ts              # QIDO-RS + WADO-RS HTTP client (pure Node fetch)
├── orthanc-poller.ts              # polling loop + diff
└── tests/
    ├── setup.ts                   # vitest setup (node env)
    ├── orthanc-client.test.ts     # HTTP client unit tests (mocked fetch)
    └── orthanc-poller.test.ts     # poller diff logic unit tests
```

### Modified & added — `web/` (web build stays functional unchanged)

```
web/src/
├── types/
│   ├── mode.types.ts              # MODIFY — add 'pacs' variant
│   ├── pacs.types.ts              # NEW — PacsStudy, PacsStudyLoad, PacsApi
│   └── index.ts                   # MODIFY — re-export pacs types
├── vite-env.d.ts                  # MODIFY — declare window.pacs
├── context/
│   ├── StudyContext.tsx           # MODIFY — add 'pacs' slot to per-mode Record
│   └── AboutPanelContext.tsx      # NEW — open/close state for AboutPanel
├── service/
│   └── pacs-ipc.service.ts        # NEW — DicomSource<string> via window.pacs
├── components/
│   ├── Sidebar/
│   │   └── sidebar-items.tsx      # MODIFY — conditionally append PACS item
│   ├── StudyList/
│   │   ├── StudyList.tsx          # NEW — pure JSX list of PacsStudy
│   │   └── types/index.ts         # NEW
│   ├── AboutPanel/
│   │   ├── AboutPanel.tsx         # NEW — modal explainer
│   │   └── types/index.ts         # NEW
│   ├── Toolbar/
│   │   ├── Toolbar.tsx            # MODIFY — add ? button when in Electron
│   │   └── types/index.ts         # MODIFY — add onOpenAbout prop
│   └── Layout/
│       ├── Layout.tsx             # MODIFY — route to PacsPage; wire AboutPanel
│       └── hooks/useActivePageData.ts # MODIFY — add 'pacs' branch
└── pages/
    └── PacsPage/                  # NEW
        ├── PacsPage.tsx
        ├── hooks/usePacsStudy.ts
        ├── hooks/usePacsStudyList.ts
        └── types/index.ts

web/tests/
└── service/
    └── pacs-ipc.service.test.ts   # NEW
```

**Responsibility boundaries:**
- `electron/main.ts` owns only app lifecycle + IPC wiring. Never calls Orthanc directly.
- `electron/orthanc-client.ts` is pure (no state, no side effects beyond HTTP). One function per DICOMweb call.
- `electron/orthanc-poller.ts` owns the `setInterval` + list-diff. Emits callback events; doesn't touch IPC.
- `electron/preload.ts` exposes exactly three functions via `contextBridge.exposeInMainWorld('pacs', ...)`: `listStudies`, `loadStudy`, `onStudiesChanged`.
- `web/src/service/pacs-ipc.service.ts` is the only web-side file that touches `window.pacs`. Every other web-side file uses the `pacsSource` it exports.
- `web/src/pages/PacsPage/hooks/*` are the only hooks that hit `pacsSource`; components in `web/src/pages/PacsPage/` are pure JSX.

---

## Task 1: Scaffold `electron/` project (hello-world window)

**Files:**
- Create: `electron/package.json`, `electron/tsconfig.json`, `electron/electron.vite.config.ts`, `electron/main.ts`, `electron/preload.ts`, `electron/README.md`, `electron/.env.example`, `electron/.env`, `electron/.gitignore`

- [ ] **Step 1: Create `electron/package.json`**

```json
{
  "name": "electron",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "electron": "^32.2.5",
    "electron-builder": "^25.1.8",
    "electron-vite": "^2.3.0",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 2: Create `electron/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node", "electron", "vitest/globals"]
  },
  "include": ["*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 3: Create `electron/electron.vite.config.ts`**

```ts
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import { resolve } from 'node:path';

const WEB_ROOT = resolve(__dirname, '../web');

export default defineConfig({
  main: {
    build: {
      outDir: resolve(__dirname, 'dist-electron'),
      rollupOptions: { input: resolve(__dirname, 'main.ts') },
    },
  },
  preload: {
    build: {
      outDir: resolve(__dirname, 'dist-electron'),
      rollupOptions: { input: resolve(__dirname, 'preload.ts') },
    },
  },
  // Renderer points at the existing web/ project — no code duplication.
  renderer: {
    root: WEB_ROOT,
    build: {
      outDir: resolve(__dirname, 'dist-renderer'),
    },
    plugins: [react(), viteCommonjs()],
    resolve: {
      alias: [
        {
          find: '@icr/polyseg-wasm',
          replacement: resolve(WEB_ROOT, 'empty-module.js'),
        },
      ],
    },
    optimizeDeps: {
      exclude: ['@cornerstonejs/dicom-image-loader'],
      include: ['dicom-parser'],
    },
    worker: { format: 'es' },
    server: { port: 5173 },
  },
});
```

- [ ] **Step 4: Create minimal `electron/main.ts`** (renderer loading only — IPC wiring comes in Task 6)

```ts
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

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
    mainWindow.loadFile(resolve(__dirname, '../dist-renderer/index.html'));
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

- [ ] **Step 5: Create minimal `electron/preload.ts`**

```ts
// Preload surface expanded in Task 6 to expose window.pacs.
// Empty preload keeps contextIsolation enabled and the window bootable.
export {};
```

- [ ] **Step 6: Create `electron/.env.example` and `electron/.env`**

Both files:
```
ORTHANC_URL=http://localhost:8042
ORTHANC_USER=orthanc
ORTHANC_PASSWORD=orthanc
```

- [ ] **Step 7: Create `electron/.gitignore`**

```
node_modules/
dist-electron/
dist-renderer/
.env
*.log
```

- [ ] **Step 8: Create `electron/README.md`**

```markdown
# electron

Electron wrapper for Copilot. Loads `web/src/` as its renderer. Adds PACS mode via IPC.

## Run (dev)

```bash
cd electron
npm install
npm run dev
```

Opens a native window. The sidebar shows Browser / Server / PACS items.

## Configure Orthanc

`electron/.env` controls the Orthanc target:

```
ORTHANC_URL=http://localhost:8042
ORTHANC_USER=orthanc
ORTHANC_PASSWORD=orthanc
```

See `docs/orthanc/setup.md` for how to run Orthanc locally.

## Test

```bash
npm test
```
```

- [ ] **Step 9: Install Electron deps**

Run from `electron/`:
```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/electron
npm install
```
Expected: `node_modules/` populates, no fatal errors. Peer-dep warnings from Electron are normal.

- [ ] **Step 10: Also install `@originjs/vite-plugin-commonjs` in `electron/` if it's not already available via web/**

It's already in `web/devDependencies`, but `electron-vite` resolves from `electron/node_modules/` for the renderer. Easiest fix — install it locally too:
```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/electron
npm install --save-dev @originjs/vite-plugin-commonjs @vitejs/plugin-react
```

- [ ] **Step 11: Run electron dev**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/electron
npm run dev
```
Expected: a native window opens showing the existing web React app (sidebar with Browser only + Server based items). No crashes. Stop with Ctrl+C.

If Vite complains about the renderer config, double-check that `electron.vite.config.ts`'s `renderer.root` points at the correct absolute path to `web/`.

- [ ] **Step 12: (SKIP COMMIT — user commits manually)**

---

## Task 2: Orthanc local setup doc

**Files:**
- Create: `docs/orthanc/setup.md`

- [ ] **Step 1: Create `docs/orthanc/setup.md`**

```markdown
# Orthanc setup for Phase 3

Orthanc is the simulated "imaging software" in our Phase 3 demo. Free, open-source PACS with DICOMweb support (QIDO-RS, WADO-RS, STOW-RS).

## Run via Docker (recommended)

```bash
docker run --rm -d --name copilot-orthanc \
  -p 4242:4242 -p 8042:8042 \
  jodogne/orthanc-plugins
```

- Port **8042** — HTTP admin UI + DICOMweb (we use this).
- Port 4242 — classic DIMSE (not used, but Orthanc's default).

Default credentials: `orthanc` / `orthanc`.

## Smoke-test

```bash
curl -u orthanc:orthanc 'http://localhost:8042/system' | head -c 200
curl -u orthanc:orthanc 'http://localhost:8042/dicom-web/studies'    # [] until you upload
```

## Upload a study (simulates "tech imports from sensor")

1. Open http://localhost:8042 (login: orthanc / orthanc)
2. Click "Upload" → drag `samples/dental-pano.dcm` in.
3. Re-run the QIDO-RS curl — the study now appears.

## Stop

```bash
docker stop copilot-orthanc
```
```

- [ ] **Step 2: Run Orthanc and verify**

```bash
docker run --rm -d --name copilot-orthanc \
  -p 4242:4242 -p 8042:8042 \
  jodogne/orthanc-plugins
sleep 3
curl -u orthanc:orthanc 'http://localhost:8042/system' | head -c 300
```
Expected: JSON with Orthanc version info. Leave Orthanc running — subsequent tasks use it.

- [ ] **Step 3: (SKIP COMMIT)**

---

## Task 3: `orthanc-client.ts` — DICOMweb HTTP client (TDD)

**Files:**
- Create: `electron/orthanc-client.ts`, `electron/tests/orthanc-client.test.ts`, `electron/tests/setup.ts`, `electron/vitest.config.ts`

- [ ] **Step 1: Create `electron/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 2: Create `electron/tests/setup.ts`**

```ts
// Node env test setup — currently no globals needed.
export {};
```

- [ ] **Step 3: Write the failing test**

Create `electron/tests/orthanc-client.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStudies, listSeries, listInstanceUIDs, fetchInstance } from '../orthanc-client';

const BASE = { baseUrl: 'http://orthanc.test/dicom-web', auth: 'Basic xxx' };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('orthanc-client', () => {
  it('listStudies flattens QIDO-RS JSON into PacsStudy[]', async () => {
    const fake = [{
      '0020000D': { Value: ['1.2.3'] },
      '00100010': { Value: [{ Alphabetic: 'Doe^John' }] },
      '00100020': { Value: ['P1'] },
      '00080060': { Value: ['PX'] },
      '00080020': { Value: ['20160330'] },
      '00081030': { Value: ['pano'] },
    }];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fake), {
      status: 200, headers: { 'content-type': 'application/dicom+json' },
    })));

    const studies = await listStudies(BASE);
    expect(studies).toHaveLength(1);
    expect(studies[0].studyInstanceUID).toBe('1.2.3');
    expect(studies[0].patientName).toBe('Doe^John');
    expect(studies[0].modality).toBe('PX');
    expect(studies[0].studyDate).toBe('20160330');
  });

  it('listSeries includes studyInstanceUID on each result', async () => {
    const fake = [{
      '0020000E': { Value: ['1.2.3.1'] },
      '00080060': { Value: ['PX'] },
      '00201209': { Value: [1] },
    }];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fake), {
      status: 200, headers: { 'content-type': 'application/dicom+json' },
    })));

    const series = await listSeries('1.2.3', BASE);
    expect(series[0].studyInstanceUID).toBe('1.2.3');
    expect(series[0].seriesInstanceUID).toBe('1.2.3.1');
  });

  it('listInstanceUIDs returns only the SOP Instance UIDs', async () => {
    const fake = [
      { '00080018': { Value: ['1.2.3.1.1'] } },
      { '00080018': { Value: ['1.2.3.1.2'] } },
    ];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fake), {
      status: 200, headers: { 'content-type': 'application/dicom+json' },
    })));

    const uids = await listInstanceUIDs('1.2.3', '1.2.3.1', BASE);
    expect(uids).toEqual(['1.2.3.1.1', '1.2.3.1.2']);
  });

  it('fetchInstance extracts the first multipart body', async () => {
    const bodyBytes = new Uint8Array([0x44, 0x49, 0x43, 0x4d]); // "DICM"
    const boundary = 'mime-boundary-123';
    const multipart = [
      `--${boundary}`,
      'Content-Type: application/dicom',
      '',
      new TextDecoder('latin1').decode(bodyBytes),
      `--${boundary}--`,
      '',
    ].join('\r\n');

    vi.stubGlobal('fetch', vi.fn(async () => new Response(multipart, {
      status: 200,
      headers: { 'content-type': `multipart/related; boundary="${boundary}"; type="application/dicom"` },
    })));

    const buf = await fetchInstance('1.2.3', '1.2.3.1', '1.2.3.1.1', BASE);
    const out = new Uint8Array(buf);
    expect(Array.from(out.slice(0, 4))).toEqual([0x44, 0x49, 0x43, 0x4d]);
  });

  it('throws on non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(listStudies(BASE)).rejects.toThrow(/500/);
  });
});
```

- [ ] **Step 4: Run test — expect FAIL**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/electron
npm test
```
Expected: module-resolution failure on `orthanc-client`.

- [ ] **Step 5: Implement `electron/orthanc-client.ts`**

```ts
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
    modality:
      valueOf<string>(o, '00080061') ?? valueOf<string>(o, '00080060') ?? '',
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
  const baseUrl = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const arr = await getJson<unknown[]>(`${baseUrl}/studies`, auth);
  return arr.map(mapStudy);
}

export async function listSeries(
  studyUID: string,
  cfg: OrthancConfig = {},
): Promise<PacsSeries[]> {
  const baseUrl = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const arr = await getJson<unknown[]>(`${baseUrl}/studies/${studyUID}/series`, auth);
  return arr.map((r) => mapSeries(r, studyUID));
}

export async function listInstanceUIDs(
  studyUID: string,
  seriesUID: string,
  cfg: OrthancConfig = {},
): Promise<string[]> {
  const baseUrl = cfg.baseUrl ?? DEFAULT_BASE;
  const auth = cfg.auth ?? DEFAULT_AUTH;
  const arr = await getJson<Array<Record<string, unknown>>>(
    `${baseUrl}/studies/${studyUID}/series/${seriesUID}/instances`,
    auth,
  );
  return arr
    .map((inst) => valueOf<string>(inst, '00080018'))
    .filter((v): v is string => !!v);
}

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
  const bodyEnd = end - 2; // strip trailing \r\n
  return bytes.slice(bodyStart, bodyEnd).buffer;
}
```

- [ ] **Step 6: Run test — expect PASS**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/electron
npm test
```
Expected: 5 tests pass.

- [ ] **Step 7: (SKIP COMMIT)**

---

## Task 4: `orthanc-poller.ts` — polling loop + diff (TDD)

**Files:**
- Create: `electron/orthanc-poller.ts`, `electron/tests/orthanc-poller.test.ts`

- [ ] **Step 1: Write the failing test**

Create `electron/tests/orthanc-poller.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { createPoller } from '../orthanc-poller';
import type { PacsStudy } from '../orthanc-client';

function study(uid: string): PacsStudy {
  return {
    studyInstanceUID: uid,
    patientName: `P-${uid}`,
    patientId: '',
    modality: 'PX',
    studyDate: '20240101',
    description: '',
  };
}

describe('orthanc-poller diff', () => {
  it('emits changed=true on first successful tick', async () => {
    const listStudies = vi.fn(async () => [study('A')]);
    const onChange = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies, onChange, onError: () => {} });
    await poller.tick();
    expect(onChange).toHaveBeenCalledWith([study('A')]);
  });

  it('does not re-emit if the list is unchanged', async () => {
    const listStudies = vi.fn(async () => [study('A')]);
    const onChange = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies, onChange, onError: () => {} });
    await poller.tick();
    await poller.tick();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('emits when a new study appears', async () => {
    let studies: PacsStudy[] = [study('A')];
    const listStudies = vi.fn(async () => studies);
    const onChange = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies, onChange, onError: () => {} });
    await poller.tick();
    studies = [study('A'), study('B')];
    await poller.tick();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0]).toEqual(studies);
  });

  it('emits when a study is removed', async () => {
    let studies: PacsStudy[] = [study('A'), study('B')];
    const listStudies = vi.fn(async () => studies);
    const onChange = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies, onChange, onError: () => {} });
    await poller.tick();
    studies = [study('A')];
    await poller.tick();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('calls onError and does NOT invalidate cached list on transient failure', async () => {
    let throwIt = false;
    const listStudies = vi.fn(async () => {
      if (throwIt) throw new Error('net');
      return [study('A')];
    });
    const onChange = vi.fn();
    const onError = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies, onChange, onError });
    await poller.tick();
    throwIt = true;
    await poller.tick();
    expect(onError).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1); // not again
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/electron
npm test -- tests/orthanc-poller.test.ts
```
Expected: module-resolution failure.

- [ ] **Step 3: Implement `electron/orthanc-poller.ts`**

```ts
import type { PacsStudy } from './orthanc-client';

export interface PollerConfig {
  intervalMs: number;
  listStudies: () => Promise<PacsStudy[]>;
  onChange: (studies: PacsStudy[]) => void;
  onError: (err: unknown) => void;
}

export interface Poller {
  start(): void;
  stop(): void;
  /** Run one poll iteration immediately; useful in tests and for manual retry. */
  tick(): Promise<void>;
}

/**
 * Polls `listStudies` on an interval. Emits `onChange(studies)` only when
 * the list of study UIDs differs from the previous successful response.
 * Transient errors call `onError` without clearing the last-known list
 * (so a blip doesn't falsely look like "all studies deleted").
 */
export function createPoller(cfg: PollerConfig): Poller {
  let timer: NodeJS.Timeout | null = null;
  let last: string | null = null;

  async function tick() {
    try {
      const studies = await cfg.listStudies();
      const signature = studies.map((s) => s.studyInstanceUID).sort().join('|');
      if (signature !== last) {
        last = signature;
        cfg.onChange(studies);
      }
    } catch (err) {
      cfg.onError(err);
    }
  }

  return {
    start() {
      if (timer) return;
      void tick();
      timer = setInterval(tick, cfg.intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    tick,
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/electron
npm test
```
Expected: all orthanc-client + orthanc-poller tests pass (10 total).

- [ ] **Step 5: (SKIP COMMIT)**

---

## Task 5: IPC surface — preload + main handlers

**Files:**
- Modify: `electron/main.ts`, `electron/preload.ts`
- Create: `web/src/types/pacs.types.ts`

- [ ] **Step 1: Create `web/src/types/pacs.types.ts`** (shared shape between preload and renderer)

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
  study: PacsStudy;
  /** Cornerstone imageIds — base64 data URLs prefixed with `wadouri:`. */
  imageIds: string[];
}

export interface PacsApi {
  listStudies(): Promise<PacsStudy[]>;
  loadStudy(studyUID: string): Promise<PacsStudyLoad>;
  onStudiesChanged(cb: (studies: PacsStudy[]) => void): () => void;
  onConnectionError(cb: (message: string) => void): () => void;
}
```

- [ ] **Step 2: Replace `electron/preload.ts` with the contextBridge exposure**

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { PacsStudy, PacsStudyLoad } from '../web/src/types/pacs.types';

const api = {
  listStudies: (): Promise<PacsStudy[]> => ipcRenderer.invoke('pacs:list-studies'),
  loadStudy: (studyUID: string): Promise<PacsStudyLoad> =>
    ipcRenderer.invoke('pacs:load-study', studyUID),
  onStudiesChanged: (cb: (studies: PacsStudy[]) => void) => {
    const handler = (_e: unknown, studies: PacsStudy[]) => cb(studies);
    ipcRenderer.on('pacs:studies-changed', handler);
    return () => ipcRenderer.off('pacs:studies-changed', handler);
  },
  onConnectionError: (cb: (message: string) => void) => {
    const handler = (_e: unknown, message: string) => cb(message);
    ipcRenderer.on('pacs:connection-error', handler);
    return () => ipcRenderer.off('pacs:connection-error', handler);
  },
};

contextBridge.exposeInMainWorld('pacs', api);
```

- [ ] **Step 3: Replace `electron/main.ts` with the full IPC + poller wiring**

```ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  listStudies,
  listSeries,
  listInstanceUIDs,
  fetchInstance,
  type PacsStudy,
} from './orthanc-client';
import { createPoller } from './orthanc-poller';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ORTHANC_URL = process.env.ORTHANC_URL ?? 'http://localhost:8042';
const ORTHANC_USER = process.env.ORTHANC_USER ?? 'orthanc';
const ORTHANC_PASSWORD = process.env.ORTHANC_PASSWORD ?? 'orthanc';
const BASE_CONFIG = {
  baseUrl: `${ORTHANC_URL}/dicom-web`,
  auth: 'Basic ' + Buffer.from(`${ORTHANC_USER}:${ORTHANC_PASSWORD}`).toString('base64'),
};

let mainWindow: BrowserWindow | null = null;

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
  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(resolve(__dirname, '../dist-renderer/index.html'));
}

function startPolling() {
  const poller = createPoller({
    intervalMs: 2000,
    listStudies: () => listStudies(BASE_CONFIG),
    onChange: (studies: PacsStudy[]) => {
      mainWindow?.webContents.send('pacs:studies-changed', studies);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      mainWindow?.webContents.send('pacs:connection-error', message);
    },
  });
  poller.start();
}

ipcMain.handle('pacs:list-studies', () => listStudies(BASE_CONFIG));

ipcMain.handle('pacs:load-study', async (_evt, studyUID: string) => {
  const allStudies = await listStudies(BASE_CONFIG);
  const study = allStudies.find((s) => s.studyInstanceUID === studyUID);
  if (!study) throw new Error(`study not found: ${studyUID}`);

  const allSeries = await listSeries(studyUID, BASE_CONFIG);
  const imageIds: string[] = [];
  for (const series of allSeries) {
    const instanceUIDs = await listInstanceUIDs(
      studyUID,
      series.seriesInstanceUID,
      BASE_CONFIG,
    );
    for (const iuid of instanceUIDs) {
      const buf = await fetchInstance(
        studyUID,
        series.seriesInstanceUID,
        iuid,
        BASE_CONFIG,
      );
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

- [ ] **Step 4: Smoke-test Electron with the new main**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/electron
npm run dev
```
Expected: native window opens. Open DevTools (View → Toggle Developer Tools). In console run:
```js
window.pacs.listStudies().then(console.log);
```
Expected: either `[]` (if Orthanc is up and empty) or an array of studies. No crashes.

Stop dev with Ctrl+C.

- [ ] **Step 5: (SKIP COMMIT)**

---

## Task 6: Web-side type updates — add `pacs` mode + `window.pacs` declaration

**Files:**
- Modify: `web/src/types/mode.types.ts`, `web/src/types/index.ts`, `web/src/vite-env.d.ts`

- [ ] **Step 1: Replace `web/src/types/mode.types.ts`**

```ts
/** Rendering pipeline the user is viewing. */
export type RenderMode = 'client' | 'server' | 'pacs';
```

- [ ] **Step 2: Replace `web/src/types/index.ts`**

```ts
export type { StudyMetadata, LoadedStudy } from './dicom.types.ts';
export type { RenderMode } from './mode.types.ts';
export type { PacsStudy, PacsStudyLoad, PacsApi } from './pacs.types.ts';
```

- [ ] **Step 3: Replace `web/src/vite-env.d.ts`**

```ts
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
```

- [ ] **Step 4: Type-check web**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npx tsc --noEmit
```
Expected: passes with a new type error inside `StudyContext.tsx` or `MODE_LABELS` — these are fixed in the next task. If any other file errors, stop and report.

- [ ] **Step 5: (SKIP COMMIT)**

---

## Task 7: Wire `pacs` mode into constants + StudyContext

**Files:**
- Modify: `web/src/constants/mode.constants.ts`, `web/src/context/StudyContext.tsx`

- [ ] **Step 1: Replace `web/src/constants/mode.constants.ts`**

```ts
import type { RenderMode } from '../types/mode.types.ts';

export const MODE_LABELS: Record<RenderMode, string> = {
  client: 'Browser only',
  server: 'Server based',
  pacs: 'PACS',
};
```

- [ ] **Step 2: Replace `web/src/context/StudyContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoadedStudy, RenderMode } from '../types';

interface ModeState {
  study: LoadedStudy | null;
  currentIndex: number;
  studyName: string | null;
  error: string | null;
  loading: boolean;
}

const EMPTY: ModeState = {
  study: null,
  currentIndex: 0,
  studyName: null,
  error: null,
  loading: false,
};

interface StudyContextValue {
  states: Record<RenderMode, ModeState>;
  patch: (m: RenderMode, next: Partial<ModeState>) => void;
  reset: (m: RenderMode) => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<RenderMode, ModeState>>({
    client: { ...EMPTY },
    server: { ...EMPTY },
    pacs: { ...EMPTY },
  });

  const patch = useCallback((m: RenderMode, next: Partial<ModeState>) => {
    setStates((s) => ({ ...s, [m]: { ...s[m], ...next } }));
  }, []);

  const reset = useCallback((m: RenderMode) => {
    setStates((s) => {
      const current = s[m];
      if (current.study) {
        for (const id of current.study.imageIds) {
          if (id.startsWith('wadouri:blob:')) {
            URL.revokeObjectURL(id.replace(/^wadouri:/, ''));
          }
        }
      }
      return { ...s, [m]: { ...EMPTY } };
    });
  }, []);

  const value = useMemo<StudyContextValue>(
    () => ({ states, patch, reset }),
    [states, patch, reset],
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudyContext(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudyContext must be used inside <StudyProvider>');
  return ctx;
}

export type { ModeState };
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 4: (SKIP COMMIT)**

---

## Task 8: `pacs-ipc.service.ts` + tests

**Files:**
- Create: `web/src/service/pacs-ipc.service.ts`, `web/tests/service/pacs-ipc.service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/tests/service/pacs-ipc.service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pacsSource } from '../../src/service/pacs-ipc.service.ts';

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
      imageIds: [
        'wadouri:data:application/dicom;base64,AAA=',
        'wadouri:data:application/dicom;base64,BBB=',
      ],
    }));
    vi.stubGlobal('window', {
      ...globalThis.window,
      pacs: {
        loadStudy: mockLoad,
        listStudies: vi.fn(),
        onStudiesChanged: vi.fn(),
        onConnectionError: vi.fn(),
      },
    });

    const study = await pacsSource.load('1.2.3');
    expect(mockLoad).toHaveBeenCalledWith('1.2.3');
    expect(study.imageIds).toHaveLength(2);
    expect(study.metadata.patientName).toBe('TestPatient');
    expect(study.metadata.modality).toBe('PX');
    expect(study.metadata.studyDate).toBe('20160330');
  });

  it('throws when window.pacs is not present', async () => {
    vi.stubGlobal('window', { ...globalThis.window, pacs: undefined });
    await expect(pacsSource.load('1.2.3')).rejects.toThrow(/electron/i);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npm test -- tests/service/pacs-ipc.service.test.ts
```
Expected: module-resolution failure.

- [ ] **Step 3: Create `web/src/service/pacs-ipc.service.ts`**

```ts
import type { DicomSource } from '../lib/utility/dicom-source.ts';
import type { LoadedStudy } from '../types';

/**
 * DicomSource that loads a study via Electron's preload bridge. Input is
 * the Study Instance UID. Throws with a clear message when run outside
 * Electron (window.pacs unavailable).
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
        bodyPart: undefined, // QIDO-RS study-level has no body-part field
        studyDate: study.studyDate || undefined,
        manufacturer: undefined,
      },
    };
  },
};
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npm test
```
Expected: all 14 tests pass (12 existing + 2 new).

- [ ] **Step 5: (SKIP COMMIT)**

---

## Task 9: `StudyList` component (pure JSX)

**Files:**
- Create: `web/src/components/StudyList/types/index.ts`, `web/src/components/StudyList/StudyList.tsx`

- [ ] **Step 1: Create `web/src/components/StudyList/types/index.ts`**

```ts
import type { PacsStudy } from '../../../types';

export interface StudyListProps {
  studies: PacsStudy[];
  selectedUID: string | null;
  onSelect: (uid: string) => void;
  orthancUiUrl: string;
}
```

- [ ] **Step 2: Create `web/src/components/StudyList/StudyList.tsx`**

```tsx
import type { StudyListProps } from './types';

function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || '—';
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function StudyList({ studies, selectedUID, onSelect, orthancUiUrl }: StudyListProps) {
  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-900/40 overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-800">
        <h2 className="text-xs uppercase tracking-wider text-slate-500">PACS studies</h2>
        <p className="text-xs text-slate-600 mt-1">{studies.length} available</p>
      </div>
      {studies.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">
          No studies yet. Upload a DICOM file to Orthanc at{' '}
          <a className="text-accent" href={orthancUiUrl} target="_blank" rel="noreferrer">
            {orthancUiUrl}
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
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 4: (SKIP COMMIT)**

---

## Task 10: `PacsPage` + hooks

**Files:**
- Create: `web/src/pages/PacsPage/types/index.ts`, `web/src/pages/PacsPage/hooks/usePacsStudyList.ts`, `web/src/pages/PacsPage/hooks/usePacsStudy.ts`, `web/src/pages/PacsPage/PacsPage.tsx`

- [ ] **Step 1: Create `web/src/pages/PacsPage/types/index.ts`**

```ts
import type { LoadedStudy, PacsStudy } from '../../../types';

export interface PacsStudyListControls {
  studies: PacsStudy[];
  connectionError: string | null;
}

export interface PacsStudyControls {
  study: LoadedStudy | null;
  currentIndex: number;
  studyName: string | null;
  error: string | null;
  loading: boolean;
  selectedUID: string | null;
  onStudySelected: (uid: string) => Promise<void>;
  onReset: () => void;
  setCurrentIndex: (i: number | ((prev: number) => number)) => void;
}
```

- [ ] **Step 2: Create `web/src/pages/PacsPage/hooks/usePacsStudyList.ts`**

```ts
import { useEffect, useState } from 'react';
import type { PacsStudyListControls } from '../types';
import type { PacsStudy } from '../../../types';

/**
 * Subscribes to Electron's IPC study-change events. Also subscribes to
 * connection errors. In plain browser (no window.pacs) this returns an
 * empty list and an error message.
 */
export function usePacsStudyList(): PacsStudyListControls {
  const [studies, setStudies] = useState<PacsStudy[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.pacs) {
      setConnectionError('Electron not available — PACS mode requires the desktop app.');
      return;
    }
    // Initial pull
    window.pacs.listStudies()
      .then((s) => {
        setStudies(s);
        setConnectionError(null);
      })
      .catch((e) => setConnectionError(e instanceof Error ? e.message : String(e)));

    const unsubChange = window.pacs.onStudiesChanged((s) => {
      setStudies(s);
      setConnectionError(null);
    });
    const unsubErr = window.pacs.onConnectionError((msg) => setConnectionError(msg));
    return () => {
      unsubChange();
      unsubErr();
    };
  }, []);

  return { studies, connectionError };
}
```

- [ ] **Step 3: Create `web/src/pages/PacsPage/hooks/usePacsStudy.ts`**

```ts
import { useCallback } from 'react';
import { useStudyContext } from '../../../context/StudyContext';
import { pacsSource } from '../../../service/pacs-ipc.service';
import type { PacsStudyControls } from '../types';

const MODE = 'pacs' as const;

/**
 * Per-mode study state for PACS mode. Loading is triggered when the user
 * clicks a study in the list — not by file upload. The selected UID is
 * tracked in studyName so switching studies feels the same as switching
 * files in the other modes.
 */
export function usePacsStudy(): PacsStudyControls {
  const { states, patch, reset } = useStudyContext();
  const current = states[MODE];

  const onStudySelected = useCallback(
    async (studyUID: string) => {
      patch(MODE, { loading: true, error: null, studyName: studyUID });
      try {
        const loaded = await pacsSource.load(studyUID);
        patch(MODE, {
          study: loaded,
          currentIndex: 0,
          studyName: loaded.metadata.patientName || studyUID,
          loading: false,
        });
      } catch (e) {
        patch(MODE, {
          error: e instanceof Error ? e.message : String(e),
          loading: false,
        });
      }
    },
    [patch],
  );

  const onReset = useCallback(() => reset(MODE), [reset]);

  const setCurrentIndex = useCallback(
    (idxOrFn: number | ((prev: number) => number)) => {
      const next = typeof idxOrFn === 'function' ? idxOrFn(current.currentIndex) : idxOrFn;
      patch(MODE, { currentIndex: next });
    },
    [current.currentIndex, patch],
  );

  return {
    study: current.study,
    currentIndex: current.currentIndex,
    studyName: current.studyName,
    error: current.error,
    loading: current.loading,
    selectedUID: current.studyName, // reusing the slot
    onStudySelected,
    onReset,
    setCurrentIndex,
  };
}
```

- [ ] **Step 4: Create `web/src/pages/PacsPage/PacsPage.tsx`**

```tsx
import { DicomViewer } from '../../components/DicomViewer/DicomViewer';
import { SliceScrubber } from '../../components/SliceScrubber/SliceScrubber';
import { MetadataPanel } from '../../components/MetadataPanel/MetadataPanel';
import { StudyList } from '../../components/StudyList/StudyList';
import { useMetadataPanel } from '../../context/MetadataPanelContext';
import { usePacsStudyList } from './hooks/usePacsStudyList';
import { usePacsStudy } from './hooks/usePacsStudy';

const ORTHANC_UI_URL = 'http://localhost:8042';

export function PacsPage() {
  const { studies, connectionError } = usePacsStudyList();
  const { study, currentIndex, error, loading, selectedUID, onStudySelected, setCurrentIndex } =
    usePacsStudy();
  const { open: metadataOpen } = useMetadataPanel();

  return (
    <div className="flex-1 flex min-h-0">
      <StudyList
        studies={studies}
        selectedUID={selectedUID}
        onSelect={onStudySelected}
        orthancUiUrl={ORTHANC_UI_URL}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {connectionError && (
          <div className="px-4 py-2 bg-red-950/60 border-b border-red-800 text-xs text-red-300">
            {connectionError}
          </div>
        )}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Fetching study from PACS…
          </div>
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
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 6: (SKIP COMMIT)**

---

## Task 11: Sidebar conditionally shows PACS item

**Files:**
- Modify: `web/src/components/Sidebar/sidebar-items.tsx`, `web/src/components/Sidebar/Sidebar.tsx`

- [ ] **Step 1: Replace `web/src/components/Sidebar/sidebar-items.tsx`**

```tsx
import type { SidebarItem } from './types';

const ALL_ITEMS: SidebarItem[] = [
  {
    mode: 'client',
    label: 'Browser only',
    sublabel: 'Client-side rendering',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 20h8M12 18v2" />
      </svg>
    ),
  },
  {
    mode: 'server',
    label: 'Server based',
    sublabel: '.NET + fo-dicom',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="6" rx="1" />
        <rect x="3" y="14" width="18" height="6" rx="1" />
        <path d="M7 7h.01M7 17h.01" />
      </svg>
    ),
  },
  {
    mode: 'pacs',
    label: 'PACS',
    sublabel: 'Orthanc via DICOMweb',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 14a4 4 0 0 0 4 4h8a4 4 0 0 0 0-8 5 5 0 0 0-9.9-1A4 4 0 0 0 4 14z" />
      </svg>
    ),
  },
];

/** Returns the items visible in the current runtime. PACS appears only when
 *  Electron's preload has injected window.pacs. */
export function getSidebarItems(): SidebarItem[] {
  const hasPacs = typeof window !== 'undefined' && !!window.pacs;
  return hasPacs ? ALL_ITEMS : ALL_ITEMS.filter((i) => i.mode !== 'pacs');
}
```

- [ ] **Step 2: Replace `web/src/components/Sidebar/Sidebar.tsx`**

```tsx
import type { SidebarProps } from './types';
import { getSidebarItems } from './sidebar-items';

export function Sidebar({ mode, onChange }: SidebarProps) {
  const items = getSidebarItems();
  return (
    <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900/60 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="text-sm font-semibold tracking-tight">
          Copilot <span className="text-accent">DICOM</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">Viewer hackathon</div>
      </div>
      <nav className="flex-1 p-2">
        {items.map((item) => {
          const selected = mode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => onChange(item.mode)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors
                ${selected
                  ? 'bg-accent/15 text-slate-50 ring-1 ring-accent/40'
                  : 'text-slate-300 hover:bg-slate-800/70'}`}
            >
              <span className={selected ? 'text-accent mt-0.5' : 'text-slate-500 mt-0.5'}>
                {item.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                  {item.sublabel}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-3 border-t border-slate-800 text-[11px] text-slate-600">
        Phase 1 · Phase 2 · Phase 3
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 4: (SKIP COMMIT)**

---

## Task 12: Route `pacs` mode in Layout + useActivePageData

**Files:**
- Modify: `web/src/components/Layout/hooks/useActivePageData.ts`, `web/src/components/Layout/Layout.tsx`

- [ ] **Step 1: Replace `web/src/components/Layout/hooks/useActivePageData.ts`**

```ts
import { useMode } from '../../../context/ModeContext';
import { useStudyContext } from '../../../context/StudyContext';
import { MODE_LABELS } from '../../../constants';
import { useBrowserStudy } from '../../../pages/BrowserOnlyPage/hooks/useBrowserStudy';
import { useServerStudy } from '../../../pages/ServerBasedPage/hooks/useServerStudy';
import { usePacsStudy } from '../../../pages/PacsPage/hooks/usePacsStudy';

/**
 * Exposes the active page's study info + callbacks for the chrome (Toolbar)
 * to display, without the chrome needing to know which page is mounted.
 * PACS mode has no file-upload action — onFiles becomes a no-op there.
 */
export function useActivePageData() {
  const { mode } = useMode();
  const { states } = useStudyContext();
  const current = states[mode];

  const browser = useBrowserStudy();
  const server = useServerStudy();
  const pacs = usePacsStudy();

  if (mode === 'pacs') {
    return {
      mode,
      modeLabel: MODE_LABELS[mode],
      studyName: current.studyName,
      hasStudy: !!current.study,
      onFiles: async () => { /* PACS has no file upload */ },
      onReset: pacs.onReset,
    };
  }

  const active = mode === 'client' ? browser : server;
  return {
    mode,
    modeLabel: MODE_LABELS[mode],
    studyName: current.studyName,
    hasStudy: !!current.study,
    onFiles: active.onFiles,
    onReset: active.onReset,
  };
}
```

- [ ] **Step 2: Replace `web/src/components/Layout/Layout.tsx`**

```tsx
import { Sidebar } from '../Sidebar/Sidebar';
import { Toolbar } from '../Toolbar/Toolbar';
import { BrowserOnlyPage } from '../../pages/BrowserOnlyPage/BrowserOnlyPage';
import { ServerBasedPage } from '../../pages/ServerBasedPage/ServerBasedPage';
import { PacsPage } from '../../pages/PacsPage/PacsPage';
import { useMode } from '../../context/ModeContext';
import { useMetadataPanel } from '../../context/MetadataPanelContext';
import { useActivePageData } from './hooks/useActivePageData';

export function Layout() {
  const { mode, setMode } = useMode();
  const { open: metadataOpen, toggle: toggleMetadata } = useMetadataPanel();
  const { modeLabel, studyName, hasStudy, onFiles, onReset } = useActivePageData();

  return (
    <div className="h-screen flex">
      <Sidebar mode={mode} onChange={setMode} />
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar
          onFiles={onFiles}
          onReset={onReset}
          onToggleMetadata={toggleMetadata}
          metadataOpen={metadataOpen}
          studyName={studyName}
          modeLabel={modeLabel}
          hasStudy={hasStudy}
          showFilePicker={mode !== 'pacs'}
        />
        {mode === 'client' && <BrowserOnlyPage />}
        {mode === 'server' && <ServerBasedPage />}
        {mode === 'pacs' && <PacsPage />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `web/src/components/Toolbar/types/index.ts` to accept `showFilePicker`**

```ts
export interface ToolbarProps {
  onFiles: (files: File[]) => void;
  onReset: () => void;
  onToggleMetadata: () => void;
  metadataOpen: boolean;
  studyName: string | null;
  modeLabel: string;
  hasStudy: boolean;
  /** Hide the file/folder pickers in modes that don't use uploads (e.g. PACS). */
  showFilePicker?: boolean;
}
```

- [ ] **Step 4: Update `web/src/components/Toolbar/Toolbar.tsx` to respect `showFilePicker`**

Replace the file contents:
```tsx
import { FileDropZone } from '../FileDropZone/FileDropZone';
import type { ToolbarProps } from './types';

export function Toolbar({
  onFiles,
  onReset,
  onToggleMetadata,
  metadataOpen,
  studyName,
  modeLabel,
  hasStudy,
  showFilePicker = true,
}: ToolbarProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-800 bg-slate-950">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs uppercase tracking-wider text-slate-500">{modeLabel}</span>
        {studyName && (
          <>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-300 truncate">{studyName}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showFilePicker && <FileDropZone onFiles={onFiles} compact />}
        {hasStudy && (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Type-check + run all web tests**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npx tsc --noEmit
npm test
```
Expected: tsc passes; 14 tests pass.

- [ ] **Step 6: (SKIP COMMIT)**

---

## Task 13: AboutPanel + context + `?` button in Toolbar

**Files:**
- Create: `web/src/context/AboutPanelContext.tsx`, `web/src/components/AboutPanel/types/index.ts`, `web/src/components/AboutPanel/AboutPanel.tsx`
- Modify: `web/src/App.tsx`, `web/src/components/Toolbar/Toolbar.tsx`, `web/src/components/Toolbar/types/index.ts`

- [ ] **Step 1: Create `web/src/context/AboutPanelContext.tsx`**

```tsx
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AboutPanelContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<AboutPanelContextValue | null>(null);

export function AboutPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open, setOpen, toggle: () => setOpen((v) => !v) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAboutPanel(): AboutPanelContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAboutPanel must be used inside <AboutPanelProvider>');
  return ctx;
}
```

- [ ] **Step 2: Create `web/src/components/AboutPanel/types/index.ts`**

```ts
export interface AboutPanelProps {
  open: boolean;
  onClose: () => void;
}
```

- [ ] **Step 3: Create `web/src/components/AboutPanel/AboutPanel.tsx`**

```tsx
import type { AboutPanelProps } from './types';

/**
 * Explainer modal — visible via the ? button in the Toolbar. Copy mirrors
 * docs/todo-demo-ui-explainer.md. Rendered in both web and electron; the
 * button that opens it is the entry point.
 */
export function AboutPanel({ open, onClose }: AboutPanelProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl my-10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">How this demo fits together</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5 text-sm text-slate-300 space-y-5">
          <section>
            <h3 className="text-slate-100 font-medium mb-2">Production flow (real EAssist clinic)</h3>
            <pre className="bg-slate-950/60 border border-slate-800 rounded-md p-3 text-xs text-slate-400 overflow-x-auto">
{`[X-ray sensor]  →  [vendor capture software — DEXIS /
                    Sidexis / Carestream / Planmeca]
                              │
                              │ DICOM (standard)
                              ▼
                          [Copilot]`}
            </pre>
            <p className="mt-2">
              The vendor's software captures from their sensor over USB using a proprietary driver, stores it, and exposes it as DICOM — a federally-mandated healthcare imaging standard. Copilot connects at the DICOM layer so it works with every vendor out of the box.
            </p>
          </section>

          <section>
            <h3 className="text-slate-100 font-medium mb-2">Hackathon demo flow (what you're using)</h3>
            <pre className="bg-slate-950/60 border border-slate-800 rounded-md p-3 text-xs text-slate-400 overflow-x-auto">
{`[sample .dcm file]  → dragged into
[Orthanc — free open-source DICOM server]
                              │
                              │ DICOMweb (QIDO-RS + WADO-RS)
                              ▼
                          [Copilot]`}
            </pre>
            <p className="mt-2">
              Orthanc plays the same role the vendor software plays in production. We use it so we can demonstrate DICOM integration on a laptop without trial installs of every dental vendor's product. From Copilot's point of view the two flows are identical — both end in a standard DICOM endpoint.
            </p>
          </section>

          <section>
            <h3 className="text-slate-100 font-medium mb-2">What stays vs what swaps in production</h3>
            <div className="rounded-md border border-slate-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/60 text-slate-400">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Hackathon</th>
                    <th className="text-left px-3 py-2 font-medium">Production</th>
                    <th className="text-left px-3 py-2 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr>
                    <td className="px-3 py-2">Orthanc (Docker, localhost)</td>
                    <td className="px-3 py-2">Vendor software (DEXIS / Sidexis / Carestream)</td>
                    <td className="px-3 py-2">Swap the DICOM endpoint URL — no Copilot code change</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Sample <code>.dcm</code> files uploaded manually</td>
                    <td className="px-3 py-2">Vendor software auto-exports after X-ray capture</td>
                    <td className="px-3 py-2">No Copilot change — image arrives as DICOM</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">DICOMweb via <code>localhost:8042</code></td>
                    <td className="px-3 py-2">DICOMweb (or DIMSE) over clinic LAN with auth</td>
                    <td className="px-3 py-2">Configure endpoint + credentials; protocol unchanged</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <p className="text-xs text-slate-500">
              Sample images shown are public test DICOM data (dicomlibrary-100, de-identified).
              No real patient information is involved in this demo.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Modify `web/src/components/Toolbar/types/index.ts` — add `onOpenAbout`**

Replace contents:
```ts
export interface ToolbarProps {
  onFiles: (files: File[]) => void;
  onReset: () => void;
  onToggleMetadata: () => void;
  metadataOpen: boolean;
  studyName: string | null;
  modeLabel: string;
  hasStudy: boolean;
  showFilePicker?: boolean;
  /** Shown only in Electron — opens the explainer panel. */
  onOpenAbout?: () => void;
}
```

- [ ] **Step 5: Modify `web/src/components/Toolbar/Toolbar.tsx` — add the `?` button**

Replace contents:
```tsx
import { FileDropZone } from '../FileDropZone/FileDropZone';
import type { ToolbarProps } from './types';

export function Toolbar({
  onFiles,
  onReset,
  onToggleMetadata,
  metadataOpen,
  studyName,
  modeLabel,
  hasStudy,
  showFilePicker = true,
  onOpenAbout,
}: ToolbarProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-800 bg-slate-950">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs uppercase tracking-wider text-slate-500">{modeLabel}</span>
        {studyName && (
          <>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-300 truncate">{studyName}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showFilePicker && <FileDropZone onFiles={onFiles} compact />}
        {hasStudy && (
          <>
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
          </>
        )}
        {onOpenAbout && (
          <button
            onClick={onOpenAbout}
            title="About this demo"
            className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            ?
          </button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Modify `web/src/components/Layout/Layout.tsx` to render AboutPanel + wire `onOpenAbout`**

Replace contents:
```tsx
import { Sidebar } from '../Sidebar/Sidebar';
import { Toolbar } from '../Toolbar/Toolbar';
import { AboutPanel } from '../AboutPanel/AboutPanel';
import { BrowserOnlyPage } from '../../pages/BrowserOnlyPage/BrowserOnlyPage';
import { ServerBasedPage } from '../../pages/ServerBasedPage/ServerBasedPage';
import { PacsPage } from '../../pages/PacsPage/PacsPage';
import { useMode } from '../../context/ModeContext';
import { useMetadataPanel } from '../../context/MetadataPanelContext';
import { useAboutPanel } from '../../context/AboutPanelContext';
import { useActivePageData } from './hooks/useActivePageData';

export function Layout() {
  const { mode, setMode } = useMode();
  const { open: metadataOpen, toggle: toggleMetadata } = useMetadataPanel();
  const { open: aboutOpen, setOpen: setAboutOpen } = useAboutPanel();
  const { modeLabel, studyName, hasStudy, onFiles, onReset } = useActivePageData();

  // Show the ? button only in Electron (where window.pacs is set).
  const hasPacs = typeof window !== 'undefined' && !!window.pacs;

  return (
    <div className="h-screen flex">
      <Sidebar mode={mode} onChange={setMode} />
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar
          onFiles={onFiles}
          onReset={onReset}
          onToggleMetadata={toggleMetadata}
          metadataOpen={metadataOpen}
          studyName={studyName}
          modeLabel={modeLabel}
          hasStudy={hasStudy}
          showFilePicker={mode !== 'pacs'}
          onOpenAbout={hasPacs ? () => setAboutOpen(true) : undefined}
        />
        {mode === 'client' && <BrowserOnlyPage />}
        {mode === 'server' && <ServerBasedPage />}
        {mode === 'pacs' && <PacsPage />}
      </div>
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 7: Modify `web/src/App.tsx` to wrap with `AboutPanelProvider`**

Replace contents:
```tsx
import { Layout } from './components/Layout/Layout';
import { ModeProvider } from './context/ModeContext';
import { StudyProvider } from './context/StudyContext';
import { MetadataPanelProvider } from './context/MetadataPanelContext';
import { AboutPanelProvider } from './context/AboutPanelContext';

export default function App() {
  return (
    <ModeProvider>
      <StudyProvider>
        <MetadataPanelProvider>
          <AboutPanelProvider>
            <Layout />
          </AboutPanelProvider>
        </MetadataPanelProvider>
      </StudyProvider>
    </ModeProvider>
  );
}
```

- [ ] **Step 8: Type-check**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npx tsc --noEmit
```
Expected: passes.

- [ ] **Step 9: (SKIP COMMIT)**

---

## Task 14: End-to-end smoke test (manual)

**Files:** none — execution only.

- [ ] **Step 1: Start Orthanc if not running**

```bash
docker ps | grep copilot-orthanc || \
  docker run --rm -d --name copilot-orthanc -p 4242:4242 -p 8042:8042 jodogne/orthanc-plugins
```

- [ ] **Step 2: Start the .NET backend (for regression check on Server mode)**

```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/backend/CopilotDicom.Api
dotnet run
```

- [ ] **Step 3: Start Electron in dev mode**

New terminal:
```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/electron
npm run dev
```

- [ ] **Step 4: Electron window checks**

Expected:
- Window opens with three sidebar items: Browser only, Server based, PACS.
- `?` button visible in top-right of the Toolbar.
- Clicking `?` opens the About panel with production vs hackathon diagrams.

- [ ] **Step 5: PACS mode — upload and view**

1. In a separate browser tab, go to http://localhost:8042 (creds `orthanc`/`orthanc`).
2. Click "Upload" → drag `samples/dental-pano.dcm` in.
3. Within ~3 seconds, the study appears in Copilot's PACS list.
4. Click it. Dental pano renders. Metadata panel shows `Modality: PX`, patient name `Anonymized^^`, etc.
5. In Orthanc, upload all files from `samples/mri-knee/series-000001/`. Within ~3s a new MR study appears.
6. Click it. MRI slice 1 of ~20 renders. Scrubber present. Mouse-wheel scrolls slices.

- [ ] **Step 6: Regression — Browser and Server modes still work**

1. Switch sidebar → "Browser only" → drop `samples/dental-pano.dcm`. Renders via Cornerstone3D.
2. Switch sidebar → "Server based" → drop the same file. Renders via .NET backend (PNG).
3. Switch back to PACS → the previously-clicked study is still selected (state preservation across modes).

- [ ] **Step 7: Plain browser regression**

In a regular browser tab, open the Vite dev server for the web app:
```bash
cd /Users/maheshnalawade/Work/src/copilot/copilot-hackethon/web
npm run dev
```

Open http://localhost:5173. Expected:
- Sidebar shows exactly two items: Browser only, Server based. No PACS.
- No `?` button in the Toolbar.
- Existing flows work.

- [ ] **Step 8: Orthanc-unreachable behavior**

Stop Orthanc:
```bash
docker stop copilot-orthanc
```
In Electron window, switch to PACS. Expected: red banner saying the connection error. List shows 0 studies. Restart Orthanc:
```bash
docker run --rm -d --name copilot-orthanc -p 4242:4242 -p 8042:8042 jodogne/orthanc-plugins
```
Within a few seconds the banner clears and the study list repopulates.

- [ ] **Step 9: Stop everything**

```bash
docker stop copilot-orthanc
# Ctrl+C the Electron dev server
# Ctrl+C the .NET backend
# Ctrl+C the web dev server (if running)
```

- [ ] **Step 10: (SKIP COMMIT)**

---

## Task 15: Documentation + README cross-links

**Files:**
- Modify: `README.md` (repo root), `web/README.md`
- Create: `electron/README.md` already exists from Task 1 — verify content.

- [ ] **Step 1: Update repo root `README.md` — add Electron to the monorepo description**

Replace the file's intro + Quick Start sections; keep everything else:

Open `README.md` and replace this section:
```markdown
# Copilot — DICOM Viewer (Hackathon)

Monorepo for the EAssist Copilot DICOM viewer hackathon. Multiple apps share one repo:

```
copilot-hackethon/
├── web/          # React + Cornerstone3D front-end (Vite)
├── backend/      # .NET 8 Minimal API (fo-dicom → PNG)
├── electron/     # (planned — Phase 3) Electron wrapper + Orthanc PACS client
├── samples/      # Shared DICOM test fixtures (public, from dicomlibrary-100)
└── docs/         # Specs and plans (see docs/superpowers/)
```
```

With:
```markdown
# Copilot — DICOM Viewer (Hackathon)

Monorepo for the EAssist Copilot DICOM viewer hackathon. Multiple apps share one repo:

```
copilot-hackethon/
├── web/          # React + Cornerstone3D front-end (Vite, deploys to Vercel)
├── backend/      # .NET 8 Minimal API (fo-dicom → PNG)
├── electron/     # Electron wrapper around web/ with PACS mode (Phase 3)
├── samples/      # Shared DICOM test fixtures (public, from dicomlibrary-100)
└── docs/         # Specs and plans (see docs/superpowers/)
```

## Quick start

```bash
# Web (Browser + Server modes)
cd web && npm install && npm run dev         # http://localhost:5173

# Backend (.NET — needed for Server mode)
cd backend/CopilotDicom.Api && dotnet run    # http://localhost:5050

# Electron (adds PACS mode; needs Orthanc running)
docker run --rm -d --name copilot-orthanc -p 4242:4242 -p 8042:8042 jodogne/orthanc-plugins
cd electron && npm install && npm run dev
```
```

- [ ] **Step 2: Verify `electron/README.md` is complete and accurate**

It was created in Task 1. Confirm it mentions the Orthanc Docker command and references `docs/orthanc/setup.md`. If not, update it.

- [ ] **Step 3: (SKIP COMMIT)**

---

## Done criteria for Phase 3

- [ ] `cd electron && npm test` — all electron-side tests pass (10 tests total)
- [ ] `cd web && npm test` — all web-side tests pass (14 tests total, up from 12)
- [ ] `cd electron && npm run dev` launches a native window
- [ ] Sidebar shows three items **only** inside Electron; two items in plain browser
- [ ] `?` button shown **only** in Electron
- [ ] Uploading a study to Orthanc makes it appear in Copilot within ~3s
- [ ] Clicking a study renders it correctly (dental pano + MRI series)
- [ ] Stopping Orthanc produces a user-visible error banner; restarting clears it
- [ ] Browser and Server modes unchanged in behavior
- [ ] About panel shows the explainer content from `docs/todo-demo-ui-explainer.md`
- [ ] `cd web && npx tsc --noEmit` — clean
- [ ] `cd backend && dotnet build CopilotDicom.sln` — still builds (no backend changes required)

---

## Self-Review Notes (completed during plan authoring)

**Spec coverage:**
- Spec §3 zero-code-fork + runtime feature flag: Tasks 6 (types) + 11 (sidebar filter) ✓
- Spec §3 all Orthanc HTTP in Electron main: Task 5 ✓
- Spec §3 PACS page peers Browser/Server via `DicomSource`: Task 8 (pacsSource) + Task 10 (usePacsStudy) ✓
- Spec §3 polling-based change detection using QIDO-RS: Tasks 3–5 ✓
- Spec §4 file structure: Tasks 1–13 map directly ✓
- Spec §5 happy path (1–9): Tasks 5 (IPC) + 10 (PacsPage) cover it ✓
- Spec §5 error paths: Task 10 (usePacsStudyList connection error) + Task 14 Step 8 (manual smoke) ✓
- Spec §6 About panel: Task 13 ✓
- Spec §7 portability: documented in About panel (Task 13) + QIDO-RS-only polling (Task 4) ✓
- Spec §8 testing: Tasks 3, 4, 8 (automated) + Task 14 (manual) ✓

**Placeholder scan:** none. Every code block is concrete.

**Type consistency:**
- `PacsStudy` shape: defined once in `web/src/types/pacs.types.ts` (Task 5 Step 1), re-exported from `types/index.ts` (Task 6 Step 2), imported in electron's `preload.ts` (Task 5 Step 2), referenced in `StudyList` (Task 9), `usePacsStudyList` (Task 10), etc. Matches the `PacsStudy` shape returned by `orthanc-client.listStudies` (Task 3 Step 5). All consistent.
- `PacsApi` shape: declared in Task 5 Step 1, used via `window.pacs` augmentation in `vite-env.d.ts` (Task 6 Step 3). Four methods: `listStudies`, `loadStudy`, `onStudiesChanged`, `onConnectionError` — all four implemented by preload in Task 5 Step 2.
- `DicomSource<string>`: `pacsSource` input is Study UID (string), matching `usePacsStudy.onStudySelected(uid: string)` and `PacsApi.loadStudy(studyUID: string)`. Consistent.
- `RenderMode`: `'client' | 'server' | 'pacs'` — defined Task 6 Step 1. Used in `MODE_LABELS` (Task 7 Step 1), `Record<RenderMode, ModeState>` (Task 7 Step 2), `SidebarItem.mode` (Task 11 Step 1), `Layout` routing (Task 12 + 13). All three variants handled wherever `RenderMode` is used.
