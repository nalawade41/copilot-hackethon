# Phase 1 — Frontend-Only DICOM Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Path note (post-restructure):** After this plan shipped, the front-end was moved into `web/`. Every `src/...` reference below is now `web/src/...`. `samples/...` references remain at the repo root (shared with backend).

**Goal:** Ship a standalone React web app that renders DICOM files (single-frame dental panoramic X-rays and multi-frame MRI series) entirely in the browser, with a modern, polished dark UI, deployable to Vercel.

**Architecture:** Single-page app on Vite + React + TypeScript. Rendering via Cornerstone3D. A `DicomSource` interface decouples the viewer from the data source — in Phase 1 only the browser-`File`-based source exists, but the shape is set up so Phase 2 (server source) and Phase 3 (PACS source) plug in without touching the viewer. Styling via Tailwind CSS, dark theme.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Cornerstone3D (`@cornerstonejs/core`, `@cornerstonejs/dicom-image-loader`, `@cornerstonejs/tools`), `dicom-parser`, Tailwind CSS, Vitest + React Testing Library, Vercel for hosting.

**Spec:** `docs/superpowers/specs/2026-04-13-dicom-viewer-design.md`

---

## File Structure

```
copilot-hackethon/
├── samples/
│   ├── dental-pano.dcm                   (moved from root image-000001.dcm)
│   └── mri-knee/
│       └── series-000001/*.dcm           (moved from root series-000001/)
├── src/
│   ├── main.tsx                          ← Vite entry, initializes Cornerstone
│   ├── App.tsx                           ← root layout
│   ├── index.css                         ← Tailwind directives
│   ├── types.ts                          ← shared types
│   ├── lib/
│   │   ├── cornerstone-init.ts           ← one-time engine + loader init
│   │   ├── dicom-source.ts               ← DicomSource interface + types
│   │   ├── file-source.ts                ← Phase 1 implementation
│   │   └── metadata.ts                   ← extract DICOM tags via dicom-parser
│   └── components/
│       ├── FileDropZone.tsx              ← drag-drop + picker
│       ├── DicomViewer.tsx               ← Cornerstone viewport wrapper
│       ├── Toolbar.tsx                   ← tool-mode switcher
│       ├── SliceScrubber.tsx             ← slider for stack mode
│       └── MetadataPanel.tsx             ← shows 5-6 DICOM fields
├── tests/
│   ├── setup.ts                          ← vitest setup (jsdom, RTL)
│   ├── lib/
│   │   ├── file-source.test.ts
│   │   ├── metadata.test.ts
│   │   └── dicom-source-contract.ts      ← shared contract test (used by Phase 2+)
│   └── components/
│       └── MetadataPanel.test.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── vitest.config.ts
├── .gitignore
├── vercel.json
└── README.md
```

**Responsibility per file:**
- `cornerstone-init.ts` — wraps all Cornerstone3D init calls behind a single idempotent `initCornerstone()`. Nobody else calls `csInit`/etc. directly.
- `dicom-source.ts` — defines `DicomSource`, `LoadedStudy`, `StudyMetadata`. Zero runtime logic; types only.
- `file-source.ts` — implements `DicomSource` by turning `File[]` into `wadouri:` imageIds.
- `metadata.ts` — pure function `extractMetadata(ArrayBuffer): StudyMetadata`.
- `DicomViewer.tsx` — the ONLY file that touches the cornerstone rendering engine / viewports / tools.
- Every other component is presentation only.

---

## Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.gitignore`, `README.md`

- [ ] **Step 1: Initialize git repo**

Run:
```bash
git init
git branch -m main
```

- [ ] **Step 2: Create `.gitignore`**

Create `/Users/maheshnalawade/Work/src/copilot/copilot-hackethon/.gitignore`:
```gitignore
node_modules/
dist/
.vite/
coverage/
*.log
.DS_Store
.env
.env.local

# DICOM — never commit ad-hoc files outside samples/
*.dcm
!samples/**/*.dcm
```

- [ ] **Step 3: Create `package.json`**

Create `package.json`:
```json
{
  "name": "copilot-hackethon",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
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
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create `tsconfig.node.json`**

Create `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 6: Create `vite.config.ts`**

Create `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
  },
});
```

- [ ] **Step 7: Create `vitest.config.ts`**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 8: Create `index.html`**

Create `index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Copilot — DICOM Viewer</title>
  </head>
  <body class="bg-slate-950">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Create initial `src/main.tsx`** (Cornerstone init comes in Task 3)

Create `src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 10: Create placeholder `src/App.tsx`**

Create `src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="min-h-screen text-slate-100 flex items-center justify-center">
      <h1 className="text-2xl">Copilot DICOM Viewer — Phase 1 scaffold</h1>
    </div>
  );
}
```

- [ ] **Step 11: Create `src/index.css`** (Tailwind will be configured in Task 2)

Create `src/index.css`:
```css
/* Tailwind directives added in next task */
html, body, #root {
  margin: 0;
  padding: 0;
  height: 100%;
}
body {
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 12: Create `README.md`**

Create `README.md`:
```markdown
# Copilot — DICOM Viewer (Hackathon)

Phase 1: frontend-only React + Cornerstone3D viewer for dental X-rays and MRI series.

## Develop

    npm install
    npm run dev

Open http://localhost:5173 and drop a `.dcm` file or a folder of slices onto the page.

## Sample data

- `samples/dental-pano.dcm` — single-frame dental panoramic X-ray (uncompressed)
- `samples/mri-knee/series-000001/` — multi-frame MRI series (JPEG Lossless)

## Test

    npm test

## Spec & plans

See `docs/superpowers/`.
```

- [ ] **Step 13: Install dependencies**

Run:
```bash
npm install
```
Expected: `node_modules/` appears, no errors. If `npm` warns about peer deps from Cornerstone, that's fine — ignore.

- [ ] **Step 14: Verify dev server starts**

Run:
```bash
npm run dev
```
Expected: Vite prints `Local: http://localhost:5173/`. Open it in a browser — should show "Copilot DICOM Viewer — Phase 1 scaffold" on a dark background. Stop the server (Ctrl+C).

- [ ] **Step 15: Commit**

```bash
git add .
git commit -m "chore: scaffold Vite + React + TS project"
```

---

## Task 2: Configure Tailwind CSS with dark theme

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`
- Modify: `src/index.css`, `src/App.tsx`

- [ ] **Step 1: Create `tailwind.config.js`**

Create `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // subtle accent for the toolbar active state
        accent: {
          DEFAULT: '#38bdf8', // sky-400
          muted: '#0ea5e9',   // sky-500
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Create `postcss.config.js`**

Create `postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 3: Replace `src/index.css` with Tailwind directives**

Replace the entire contents of `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  @apply bg-slate-950 text-slate-100 font-sans antialiased;
}
```

- [ ] **Step 4: Update `src/App.tsx` to sanity-check Tailwind**

Replace the contents of `src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">
          Copilot — <span className="text-accent">DICOM Viewer</span>
        </h1>
      </header>
      <main className="flex-1 flex items-center justify-center text-slate-400">
        Tailwind is live.
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run:
```bash
npm run dev
```
Expected: Header bar on a dark slate background, "DICOM Viewer" in accent (sky blue). Stop server.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: add Tailwind CSS with dark theme defaults"
```

---

## Task 3: Cornerstone3D initialization module

**Files:**
- Create: `src/lib/cornerstone-init.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/lib/cornerstone-init.ts`**

Create `src/lib/cornerstone-init.ts`:
```ts
import { init as csInit } from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
// dicom-image-loader has a slightly different shape; import the whole namespace
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

let initialized = false;

/**
 * Initialize Cornerstone3D exactly once for the lifetime of the page.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initCornerstone(): Promise<void> {
  if (initialized) return;

  await csInit();
  await csToolsInit();

  // Register the WADO-URI image loader. The loader reads ArrayBuffers via fetch()
  // against imageIds of the form `wadouri:<url>`. For Phase 1 we use `blob:` URLs
  // produced from user-dropped File objects.
  cornerstoneDICOMImageLoader.init({
    maxWebWorkers: Math.min(navigator.hardwareConcurrency || 1, 4),
  });

  initialized = true;
}
```

- [ ] **Step 2: Update `src/main.tsx` to call `initCornerstone` before rendering**

Replace the contents of `src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initCornerstone } from './lib/cornerstone-init.ts';
import './index.css';

async function bootstrap() {
  await initCornerstone();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
```

- [ ] **Step 3: Run dev server and check the browser console**

Run:
```bash
npm run dev
```
Expected: app loads, no console errors from Cornerstone. (You may see info-level messages from Cornerstone about worker counts — ignore.) Stop server.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: one-time Cornerstone3D initialization module"
```

---

## Task 4: Shared types (`types.ts`, `dicom-source.ts`)

**Files:**
- Create: `src/types.ts`, `src/lib/dicom-source.ts`

- [ ] **Step 1: Create `src/types.ts`**

Create `src/types.ts`:
```ts
/** Fields extracted from DICOM tags for the metadata panel. */
export interface StudyMetadata {
  patientName?: string;
  patientId?: string;
  modality?: string;
  bodyPart?: string;
  studyDate?: string;
  manufacturer?: string;
}

/** Result of loading one or more DICOM files. */
export interface LoadedStudy {
  /** Ordered list of Cornerstone imageIds, one per frame/slice. */
  imageIds: string[];
  /** Metadata extracted from the first image in the study. */
  metadata: StudyMetadata;
}
```

- [ ] **Step 2: Create `src/lib/dicom-source.ts`**

Create `src/lib/dicom-source.ts`:
```ts
import type { LoadedStudy } from '../types.ts';

/**
 * A DicomSource turns some input (browser Files, a server response, a PACS URL,
 * etc.) into a LoadedStudy the viewer can render.
 *
 * The viewer component never talks to sources directly — App wires a source
 * implementation and passes LoadedStudy down as props.
 */
export interface DicomSource<TInput> {
  /** Human-readable name shown in UI where appropriate. */
  readonly name: string;
  /** Load a study from the source's input type. */
  load(input: TInput): Promise<LoadedStudy>;
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: DicomSource interface and shared types"
```

---

## Task 5: DICOM metadata extraction utility (TDD)

**Files:**
- Create: `tests/setup.ts`, `tests/lib/metadata.test.ts`, `src/lib/metadata.ts`

- [ ] **Step 1: Create `tests/setup.ts`**

Create `tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Write the failing test**

Create `tests/lib/metadata.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractMetadata } from '../../src/lib/metadata.ts';

describe('extractMetadata', () => {
  it('extracts dental pano fields from a real DICOM ArrayBuffer', () => {
    const buf = readFileSync(resolve(__dirname, '../../samples/dental-pano.dcm'));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    const meta = extractMetadata(ab as ArrayBuffer);

    expect(meta.modality).toBe('PX');
    expect(meta.bodyPart).toMatch(/jaw/i);
    expect(meta.manufacturer).toMatch(/instrumentarium/i);
    expect(meta.studyDate).toBe('20160330');
  });

  it('returns an object with undefined fields for a buffer with no DICOM preamble', () => {
    const empty = new ArrayBuffer(200);
    const meta = extractMetadata(empty);
    expect(meta).toEqual({
      patientName: undefined,
      patientId: undefined,
      modality: undefined,
      bodyPart: undefined,
      studyDate: undefined,
      manufacturer: undefined,
    });
  });
});
```

- [ ] **Step 3: Run test — expect failure**

Run:
```bash
npm test -- tests/lib/metadata.test.ts
```
Expected: FAIL with "Cannot find module '../../src/lib/metadata.ts'".

- [ ] **Step 4: Implement `extractMetadata`**

Create `src/lib/metadata.ts`:
```ts
import dicomParser from 'dicom-parser';
import type { StudyMetadata } from '../types.ts';

const EMPTY: StudyMetadata = {
  patientName: undefined,
  patientId: undefined,
  modality: undefined,
  bodyPart: undefined,
  studyDate: undefined,
  manufacturer: undefined,
};

/**
 * Extract a fixed set of DICOM tags from an in-memory DICOM ArrayBuffer.
 * Returns an all-undefined StudyMetadata on parse failure rather than throwing.
 */
export function extractMetadata(buffer: ArrayBuffer): StudyMetadata {
  let dataSet: dicomParser.DataSet;
  try {
    dataSet = dicomParser.parseDicom(new Uint8Array(buffer));
  } catch {
    return { ...EMPTY };
  }

  const s = (tag: string) => {
    const v = dataSet.string(tag);
    return v && v.trim() !== '' ? v.trim() : undefined;
  };

  return {
    patientName: s('x00100010'),
    patientId: s('x00100020'),
    modality: s('x00080060'),
    bodyPart: s('x00180015'),
    studyDate: s('x00080020'),
    manufacturer: s('x00080070'),
  };
}
```

- [ ] **Step 5: Run test — expect pass**

Run:
```bash
npm test -- tests/lib/metadata.test.ts
```
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: extractMetadata utility with tests"
```

---

## Task 6: Move sample files into `samples/`

**Files:**
- Move: `image-000001.dcm` → `samples/dental-pano.dcm`
- Move: `series-000001/*.dcm` → `samples/mri-knee/series-000001/*.dcm`

- [ ] **Step 1: Create samples directory structure and move files**

Run:
```bash
mkdir -p samples/mri-knee
git mv image-000001.dcm samples/dental-pano.dcm
git mv series-000001 samples/mri-knee/series-000001
```

- [ ] **Step 2: (Optional) Remove extra unused MRI series to keep repo slim**

For Phase 1 a single MRI series is enough. The remaining series-000002..006 and image-000001 copies inside series folders can be removed. If you want to keep everything, skip this step.

Run (only if trimming):
```bash
rm -rf series-000002 series-000003 series-000004 series-000005 series-000006
```

- [ ] **Step 3: Verify metadata test still passes with the new path**

The path in `tests/lib/metadata.test.ts` already uses `samples/dental-pano.dcm`.

Run:
```bash
npm test -- tests/lib/metadata.test.ts
```
Expected: 2 tests pass.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: organize sample DICOM files under samples/"
```

---

## Task 7: `file-source.ts` — browser `File[]` → imageIds (TDD)

**Files:**
- Create: `tests/lib/dicom-source-contract.ts`, `tests/lib/file-source.test.ts`, `src/lib/file-source.ts`

- [ ] **Step 1: Create the shared DicomSource contract**

Create `tests/lib/dicom-source-contract.ts`:
```ts
import { expect } from 'vitest';
import type { DicomSource } from '../../src/lib/dicom-source.ts';

/**
 * Shared contract that every DicomSource implementation must satisfy.
 * Called from per-implementation test files.
 *
 * `makeInput` produces an input appropriate for the source under test.
 * `expectedImageIdCount` is the expected number of imageIds that result.
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
```

- [ ] **Step 2: Write the failing test for `file-source`**

Create `tests/lib/file-source.test.ts`:
```ts
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileSource } from '../../src/lib/file-source.ts';
import { runDicomSourceContract } from './dicom-source-contract.ts';

function loadSample(relative: string): File {
  const buf = readFileSync(resolve(__dirname, '../../', relative));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new File([ab], relative.split('/').pop()!, { type: 'application/dicom' });
}

beforeAll(() => {
  // jsdom supports URL.createObjectURL only partially; stub for determinism.
  let counter = 0;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => `blob:mock/${counter++}`,
    revokeObjectURL: () => undefined,
  });
});

describe('fileSource', () => {
  it('produces one wadouri imageId for a single file', async () => {
    const file = loadSample('samples/dental-pano.dcm');
    const study = await fileSource.load([file]);
    expect(study.imageIds).toHaveLength(1);
    expect(study.imageIds[0]).toMatch(/^wadouri:blob:/);
    expect(study.metadata.modality).toBe('PX');
  });

  it('produces N imageIds for N files, metadata from the first', async () => {
    const files = [
      loadSample('samples/mri-knee/series-000001/image-000001.dcm'),
      loadSample('samples/mri-knee/series-000001/image-000002.dcm'),
      loadSample('samples/mri-knee/series-000001/image-000003.dcm'),
    ];
    const study = await fileSource.load(files);
    expect(study.imageIds).toHaveLength(3);
    for (const id of study.imageIds) {
      expect(id).toMatch(/^wadouri:blob:/);
    }
    expect(study.metadata.modality).toBe('MR');
  });

  it('satisfies the shared DicomSource contract', async () => {
    await runDicomSourceContract(
      fileSource,
      () => [loadSample('samples/dental-pano.dcm')],
      1,
    );
  });

  it('rejects when given no files', async () => {
    await expect(fileSource.load([])).rejects.toThrow(/no files/i);
  });
});
```

- [ ] **Step 3: Run test — expect failure**

Run:
```bash
npm test -- tests/lib/file-source.test.ts
```
Expected: FAIL — "Cannot find module '../../src/lib/file-source.ts'".

- [ ] **Step 4: Implement `file-source`**

Create `src/lib/file-source.ts`:
```ts
import type { DicomSource } from './dicom-source.ts';
import type { LoadedStudy } from '../types.ts';
import { extractMetadata } from './metadata.ts';

/**
 * Phase 1 DicomSource: accepts an array of browser File objects, produces
 * one `wadouri:<blob-url>` imageId per file. Metadata is extracted from the
 * first file in the list.
 *
 * Files should be pre-sorted by the caller when slice ordering matters.
 */
export const fileSource: DicomSource<File[]> = {
  name: 'Local files',

  async load(files: File[]): Promise<LoadedStudy> {
    if (files.length === 0) {
      throw new Error('fileSource.load: no files provided');
    }

    // Sort files lexicographically by name so a folder of
    // image-000001.dcm, image-000002.dcm, ... loads in slice order.
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const imageIds = sorted.map((f) => `wadouri:${URL.createObjectURL(f)}`);
    const firstBuffer = await sorted[0].arrayBuffer();
    const metadata = extractMetadata(firstBuffer);

    return { imageIds, metadata };
  },
};
```

- [ ] **Step 5: Run test — expect pass**

Run:
```bash
npm test -- tests/lib/file-source.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: fileSource + DicomSource contract test"
```

---

## Task 8: `FileDropZone` component

**Files:**
- Create: `src/components/FileDropZone.tsx`

- [ ] **Step 1: Create `FileDropZone`**

Create `src/components/FileDropZone.tsx`:
```tsx
import { useCallback, useRef, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  /** When true, render as a compact bar (after a study is loaded). */
  compact?: boolean;
}

/**
 * Drag-drop zone plus two buttons (file picker, folder picker).
 * Filters to .dcm files (or files with no extension — some DICOM exports
 * omit the extension).
 */
export function FileDropZone({ onFiles, compact = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const files = Array.from(list).filter(
        (f) => f.name.toLowerCase().endsWith('.dcm') || !f.name.includes('.'),
      );
      if (files.length === 0) return;
      onFiles(files);
    },
    [onFiles],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handle(e.dataTransfer.files);
  };

  if (compact) {
    return (
      <div className="flex gap-2">
        <button
          className="px-3 py-1.5 text-sm rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700"
          onClick={() => fileInputRef.current?.click()}
        >
          Open file
        </button>
        <button
          className="px-3 py-1.5 text-sm rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700"
          onClick={() => folderInputRef.current?.click()}
        >
          Open folder
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".dcm,application/dicom"
          multiple
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error — webkitdirectory is a non-standard attribute
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-colors
        ${dragging ? 'border-accent bg-accent/5' : 'border-slate-700 bg-slate-900/40'}
        p-16 text-center`}
    >
      <div className="text-lg text-slate-200">Drop a DICOM file or folder here</div>
      <div className="text-sm text-slate-500">Supports .dcm files and folders of slice series</div>
      <div className="flex gap-2 mt-2">
        <button
          className="px-4 py-2 rounded-md bg-accent text-slate-950 font-medium hover:bg-accent-muted"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose file
        </button>
        <button
          className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700"
          onClick={() => folderInputRef.current?.click()}
        >
          Choose folder
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".dcm,application/dicom"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error — webkitdirectory is a non-standard attribute
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: FileDropZone component with drag-drop and pickers"
```

---

## Task 9: `MetadataPanel` component (TDD)

**Files:**
- Create: `tests/components/MetadataPanel.test.tsx`, `src/components/MetadataPanel.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/MetadataPanel.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetadataPanel } from '../../src/components/MetadataPanel.tsx';

describe('MetadataPanel', () => {
  it('renders provided fields', () => {
    render(
      <MetadataPanel
        metadata={{
          modality: 'PX',
          bodyPart: 'Jaw region',
          manufacturer: 'Instrumentarium Dental',
          studyDate: '20160330',
        }}
      />,
    );
    expect(screen.getByText('PX')).toBeInTheDocument();
    expect(screen.getByText('Jaw region')).toBeInTheDocument();
    expect(screen.getByText('Instrumentarium Dental')).toBeInTheDocument();
    // study date formatted YYYY-MM-DD
    expect(screen.getByText('2016-03-30')).toBeInTheDocument();
  });

  it('renders placeholder dash for missing fields', () => {
    render(<MetadataPanel metadata={{ modality: 'MR' }} />);
    expect(screen.getByText('MR')).toBeInTheDocument();
    // Body Part field should render with a dash for missing value
    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run:
```bash
npm test -- tests/components/MetadataPanel.test.tsx
```
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `MetadataPanel`**

Create `src/components/MetadataPanel.tsx`:
```tsx
import type { StudyMetadata } from '../types.ts';

interface Props {
  metadata: StudyMetadata;
}

function formatDate(yyyymmdd: string | undefined): string | undefined {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

const ROWS: Array<{ label: string; key: keyof StudyMetadata; format?: (v: string) => string }> = [
  { label: 'Patient',      key: 'patientName' },
  { label: 'Patient ID',   key: 'patientId' },
  { label: 'Modality',     key: 'modality' },
  { label: 'Body part',    key: 'bodyPart' },
  { label: 'Study date',   key: 'studyDate', format: (v) => formatDate(v) ?? v },
  { label: 'Manufacturer', key: 'manufacturer' },
];

export function MetadataPanel({ metadata }: Props) {
  return (
    <aside className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Study metadata</h2>
      <dl className="space-y-2 text-sm">
        {ROWS.map(({ label, key, format }) => {
          const raw = metadata[key];
          const display = raw ? (format ? format(raw) : raw) : '—';
          return (
            <div key={key} className="grid grid-cols-[7rem_1fr] gap-2">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-200 truncate" title={display}>{display}</dd>
            </div>
          );
        })}
      </dl>
    </aside>
  );
}
```

- [ ] **Step 4: Run test — expect pass**

Run:
```bash
npm test -- tests/components/MetadataPanel.test.tsx
```
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: MetadataPanel with tests"
```

---

## Task 10: `DicomViewer` component — the Cornerstone viewport

**Files:**
- Create: `src/components/DicomViewer.tsx`

This is the only component that touches the Cornerstone rendering engine. It's not unit-tested — jsdom can't drive WebGL. It's covered by the manual smoke test.

- [ ] **Step 1: Create `DicomViewer`**

Create `src/components/DicomViewer.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import {
  RenderingEngine,
  Enums,
  type Types,
} from '@cornerstonejs/core';
import {
  addTool,
  ToolGroupManager,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  StackScrollMouseWheelTool,
  Enums as ToolEnums,
} from '@cornerstonejs/tools';

const RENDERING_ENGINE_ID = 'copilot-engine';
const VIEWPORT_ID = 'copilot-viewport';
const TOOL_GROUP_ID = 'copilot-tools';
const { MouseBindings } = ToolEnums;

let toolsRegistered = false;
function registerToolsOnce() {
  if (toolsRegistered) return;
  addTool(PanTool);
  addTool(ZoomTool);
  addTool(WindowLevelTool);
  addTool(StackScrollMouseWheelTool);
  toolsRegistered = true;
}

interface Props {
  imageIds: string[];
  /** Current slice index (controlled from parent when stack has >1 image). */
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function DicomViewer({ imageIds, currentIndex, onIndexChange }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RenderingEngine | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create the rendering engine + viewport once per mount.
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    registerToolsOnce();

    const engine = new RenderingEngine(RENDERING_ENGINE_ID);
    engineRef.current = engine;

    engine.enableElement({
      viewportId: VIEWPORT_ID,
      type: Enums.ViewportType.STACK,
      element,
      defaultOptions: { background: [0, 0, 0] },
    });

    // Configure tool group
    const existing = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
    const toolGroup = existing ?? ToolGroupManager.createToolGroup(TOOL_GROUP_ID)!;
    if (!existing) {
      toolGroup.addTool(WindowLevelTool.toolName);
      toolGroup.addTool(PanTool.toolName);
      toolGroup.addTool(ZoomTool.toolName);
      toolGroup.addTool(StackScrollMouseWheelTool.toolName);
    }
    toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);

    // Bindings: left=W/L, middle=pan, right=zoom, wheel=stack scroll
    toolGroup.setToolActive(WindowLevelTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Primary }],
    });
    toolGroup.setToolActive(PanTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Auxiliary }],
    });
    toolGroup.setToolActive(ZoomTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Secondary }],
    });
    toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

    return () => {
      toolGroup.removeViewports(RENDERING_ENGINE_ID, VIEWPORT_ID);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Load / reload the stack whenever imageIds change.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || imageIds.length === 0) return;
    const viewport = engine.getViewport(VIEWPORT_ID) as Types.IStackViewport;
    let cancelled = false;
    (async () => {
      try {
        await viewport.setStack(imageIds, Math.min(currentIndex, imageIds.length - 1));
        if (!cancelled) {
          viewport.render();
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally do NOT depend on currentIndex here — slice changes
    // within an existing stack go through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIds]);

  // Update the current slice when parent changes currentIndex.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || imageIds.length === 0) return;
    const viewport = engine.getViewport(VIEWPORT_ID) as Types.IStackViewport;
    const idx = Math.min(Math.max(currentIndex, 0), imageIds.length - 1);
    if (viewport.getCurrentImageIdIndex() !== idx) {
      viewport.setImageIdIndex(idx).then(() => viewport.render());
    }
  }, [currentIndex, imageIds]);

  // Listen for Cornerstone's own stack-scroll events so the parent state stays synced.
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as { newImageIdIndex?: number };
      if (typeof detail?.newImageIdIndex === 'number') {
        onIndexChange(detail.newImageIdIndex);
      }
    };
    element.addEventListener(Enums.Events.STACK_VIEWPORT_NEW_STACK, handler);
    element.addEventListener(Enums.Events.STACK_NEW_IMAGE, handler);
    return () => {
      element.removeEventListener(Enums.Events.STACK_VIEWPORT_NEW_STACK, handler);
      element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, handler);
    };
  }, [onIndexChange]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm p-8">
        Error rendering DICOM: {error}
      </div>
    );
  }

  return (
    <div
      ref={elementRef}
      className="flex-1 bg-black"
      // Cornerstone measures and renders into this div; it must have a size.
      style={{ minHeight: 0 }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: DicomViewer Cornerstone3D viewport component"
```

---

## Task 11: `SliceScrubber` component

**Files:**
- Create: `src/components/SliceScrubber.tsx`

- [ ] **Step 1: Create `SliceScrubber`**

Create `src/components/SliceScrubber.tsx`:
```tsx
interface Props {
  total: number;
  current: number;
  onChange: (index: number) => void;
}

export function SliceScrubber({ total, current, onChange }: Props) {
  if (total <= 1) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-800 bg-slate-900/60">
      <span className="text-xs text-slate-500 tabular-nums w-16 shrink-0">
        {current + 1} / {total}
      </span>
      <input
        type="range"
        min={0}
        max={total - 1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-accent"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: SliceScrubber component"
```

---

## Task 12: `Toolbar` component

**Files:**
- Create: `src/components/Toolbar.tsx`

- [ ] **Step 1: Create `Toolbar`**

Create `src/components/Toolbar.tsx`:
```tsx
import { FileDropZone } from './FileDropZone.tsx';

interface Props {
  onFiles: (files: File[]) => void;
  onReset: () => void;
  onToggleMetadata: () => void;
  metadataOpen: boolean;
  studyName: string | null;
}

export function Toolbar({ onFiles, onReset, onToggleMetadata, metadataOpen, studyName }: Props) {
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

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: Toolbar component"
```

---

## Task 13: Wire everything together in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx` contents**

Replace `src/App.tsx`:
```tsx
import { useCallback, useMemo, useState } from 'react';
import { fileSource } from './lib/file-source.ts';
import type { LoadedStudy } from './types.ts';
import { FileDropZone } from './components/FileDropZone.tsx';
import { DicomViewer } from './components/DicomViewer.tsx';
import { SliceScrubber } from './components/SliceScrubber.tsx';
import { MetadataPanel } from './components/MetadataPanel.tsx';
import { Toolbar } from './components/Toolbar.tsx';

export default function App() {
  const [study, setStudy] = useState<LoadedStudy | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(true);
  const [studyName, setStudyName] = useState<string | null>(null);

  const onFiles = useCallback(async (files: File[]) => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await fileSource.load(files);
      setStudy(loaded);
      setCurrentIndex(0);
      setStudyName(files.length === 1 ? files[0].name : `${files.length} slices`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const onReset = useCallback(() => {
    if (study) {
      for (const id of study.imageIds) {
        const blob = id.replace(/^wadouri:/, '');
        URL.revokeObjectURL(blob);
      }
    }
    setStudy(null);
    setCurrentIndex(0);
    setStudyName(null);
    setError(null);
  }, [study]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Loading…
        </div>
      );
    }
    if (!study) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <FileDropZone onFiles={onFiles} />
            {error && <div className="mt-4 text-sm text-red-400">{error}</div>}
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
  }, [loading, study, error, onFiles, currentIndex, metadataOpen]);

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        onFiles={onFiles}
        onReset={onReset}
        onToggleMetadata={() => setMetadataOpen((o) => !o)}
        metadataOpen={metadataOpen}
        studyName={studyName}
      />
      {content}
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and verify empty state**

Run:
```bash
npm run dev
```
Expected: drop zone visible; header bar shows "Copilot — DICOM". Don't stop the server yet.

- [ ] **Step 3: Manual smoke — drop the dental pano**

Drag `samples/dental-pano.dcm` onto the drop zone.
Expected:
- Image renders (grey panoramic X-ray of a jaw).
- Metadata panel shows Modality `PX`, Body part `Jaw region`, Manufacturer `Instrumentarium Dental`, Study date `2016-03-30`.
- No slice scrubber (single frame).
- Left-click-drag adjusts window/level (brightness/contrast).
- Right-click-drag zooms.
- Middle-click-drag pans.

Click "Close" in the toolbar; empty state returns.

- [ ] **Step 4: Manual smoke — drop the MRI folder**

Click "Open folder" in the toolbar and select `samples/mri-knee/series-000001/`.
Expected:
- Slice 1 of 24 (or the actual count) renders.
- Metadata panel shows Modality `MR`, Body part "Knee (R)" or similar.
- Slice scrubber appears at the bottom; dragging it changes slices.
- Mouse wheel over the image also scrolls slices.

Stop dev server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: wire up DICOM viewer end-to-end in App"
```

---

## Task 14: Run the full test suite and type-check

**Files:** none

- [ ] **Step 1: Run all tests**

Run:
```bash
npm test
```
Expected: all tests pass (metadata + file-source + MetadataPanel = 8 tests).

- [ ] **Step 2: Type-check (Vite build forces `tsc`)**

Run:
```bash
npm run build
```
Expected: Type-check passes, `dist/` directory created with static assets.

- [ ] **Step 3: Preview the production build**

Run:
```bash
npm run preview
```
Expected: dev-server-like URL; drop the dental pano into it, verify it still works. Stop the server.

- [ ] **Step 4: Commit** (only if `build` modified anything — usually it doesn't)

```bash
git status
# If nothing to commit, skip
```

---

## Task 15: Deploy to Vercel

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

- [ ] **Step 2: Push repo to GitHub**

(If not already pushed.) Create a GitHub repo and push:
```bash
git remote add origin <github-url>
git push -u origin main
```

- [ ] **Step 3: Import into Vercel**

Via the Vercel web UI: "Add New Project" → select the repo → accept auto-detected Vite settings → Deploy.

- [ ] **Step 4: Verify the deployed URL**

Open the Vercel-provided URL. Drop `samples/dental-pano.dcm` (which you'll need to have downloaded locally from the repo or use a different sample). Expected: same behavior as local dev.

- [ ] **Step 5: Commit `vercel.json`**

```bash
git add vercel.json
git commit -m "chore: Vercel config"
git push
```

---

## Done criteria for Phase 1

- [ ] `npm test` passes with ≥8 tests
- [ ] `npm run build` completes without type errors
- [ ] `npm run dev` renders `samples/dental-pano.dcm` with correct metadata
- [ ] `npm run dev` renders `samples/mri-knee/series-000001/` with slice scrubber
- [ ] Pan, zoom, window/level, stack-scroll all work
- [ ] Deployed Vercel URL serves the app and renders a DICOM file

---

## Self-Review Notes (done during plan writing)

**Spec coverage:**
- Goals §1 (minimal): Tasks 1-14 ✓
- Non-goals §2: respected (no measurements, no auth, no persistence, single viewport) ✓
- Architecture §3 (DicomSource abstraction): Task 4 ✓
- Phase 1 §4 (component layout): Tasks 8-13 ✓
- Testing §7 (file-source test + contract + metadata + MetadataPanel + manual smoke): Tasks 5, 7, 9, 13 ✓
- Hosting §9.3 (Vercel): Task 15 ✓
- Polish §9.1 (dark theme + Tailwind + Inter): Task 2 ✓

**Placeholder scan:** None found. All steps contain concrete code or commands.

**Type consistency:** `DicomSource`, `StudyMetadata`, `LoadedStudy`, `fileSource`, `MetadataPanel` props, `DicomViewer` props — checked each reference across tasks. Names match.
