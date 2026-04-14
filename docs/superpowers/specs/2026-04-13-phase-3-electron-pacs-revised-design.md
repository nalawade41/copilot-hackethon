# Design: Phase 3 — Electron app with Orthanc PACS integration (revised)

**Status:** Draft — awaiting user review
**Date:** 2026-04-13
**Owner:** Mahesh Nalawade
**Supersedes:** `docs/superpowers/plans/2026-04-13-phase-3-electron-orthanc.md` (original Phase 3 plan written before the monorepo restructure and before web/electron reuse was worked out)

**Context:** Phase 1 (browser-only viewer) and Phase 2 (.NET backend-rendered mode) shipped. The hackathon stretch goal is to simulate the full sensor → imaging-software → Copilot flow using real DICOM protocols. This spec defines Phase 3 as an **Electron desktop app** that talks to Orthanc via DICOMweb, while the existing web app stays unchanged and continues to deploy to Vercel on every commit.

---

## 1. Goals

### Primary
- Demonstrate DICOM ingestion from a standards-compliant PACS using DICOMweb (QIDO-RS + WADO-RS).
- Ship a desktop Copilot that works on both Mac and Windows, built from the same React codebase as the web app.
- Show a third "PACS" option inside the Electron app that sits alongside Browser only / Server based modes, so the user experience in Electron is a strict superset of the web app.

### Secondary
- Prove the architecture supports multiple deployment targets from a single codebase with no fork: the web app at `web/` deploys to Vercel on every commit, and the same code runs inside Electron via a feature-flagged sidebar item.
- Give stakeholders a tangible explainer in the UI (the About panel) showing which pieces are production-ready DICOM standards vs hackathon stand-ins.

---

## 2. Non-goals

- No packaged signed distributable (.dmg / .exe) for the hackathon demo. Run `npm run electron:dev` live. Packaging stays as future work.
- No web-app PACS mode. The web app remains Browser only + Server based; PACS is Electron-only.
- No DIMSE (classic DICOM over TCP) — we use DICOMweb (HTTP) exclusively.
- No Copilot-as-Storage-SCP (receiving pushed studies from vendor software). Documented as the production model but not implemented.
- No Orthanc configuration beyond the default Docker image. No auth, no plugins, no persistence.
- No annotation/measurement tools, no multi-viewport layouts, no AI features.

---

## 3. Architecture overview

One codebase, two runtime targets, feature-flagged at runtime:

```
                ┌────────────────────────────────────────────────┐
                │              web/src/  (React app)             │
                │                                                │
                │   Sidebar items built dynamically:             │
                │     - Browser only   (always)                  │
                │     - Server based   (always)                  │
                │     - PACS           (only if window.pacs)     │
                └────────────────────────────────────────────────┘
                       │                              │
                       │ same source                  │ same source
                       ▼                              ▼
          ┌─────────────────────────┐      ┌─────────────────────────┐
          │   Vercel build          │      │   Electron build        │
          │   (unchanged by         │      │   electron-vite loads   │
          │    Phase 3)             │      │   web/src/ + electron/  │
          │                         │      │                         │
          │   In the browser:       │      │   Preload.ts exposes    │
          │   window.pacs undefined │      │   window.pacs = {...}   │
          │   → PACS hidden         │      │   → PACS shown          │
          └─────────────────────────┘      └─────────────────────────┘
                                                       │
                                       ┌───────────────┴─────────────┐
                                       │                             │
                                       ▼                             ▼
                         ┌──────────────────────────┐      ┌──────────────────┐
                         │  Electron main process   │      │    Orthanc       │
                         │  - orthanc-client.ts     │◀────▶│    (Docker,      │
                         │    (QIDO-RS, WADO-RS     │      │    localhost     │
                         │     via Node fetch —     │      │    :8042)        │
                         │     no CORS)             │      │                  │
                         │  - 2s polling loop       │      │                  │
                         │  - IPC bridge            │      │                  │
                         └──────────────────────────┘      └──────────────────┘
```

**Load-bearing decisions:**

1. **Zero code fork.** `web/src/` is the single React codebase. The sidebar checks `typeof window.pacs === 'object'` at runtime. In a browser this is always false. In Electron the preload script sets it to true. That's the entire feature flag — no build-time `#ifdef`-style code divergence.

2. **All Orthanc HTTP lives in Electron main.** Browser-side CORS doesn't apply to Node fetch in the main process. The renderer never talks to Orthanc directly; it goes through IPC (`window.pacs.listStudies()`, `window.pacs.loadStudy(uid)`, `window.pacs.onStudiesChanged(cb)`).

3. **The PACS page is a peer of Browser and Server pages.** It plugs into the existing `DicomSource` abstraction: a new `pacsSource` is a `DicomSource<string>` (input = studyUID) that calls through `window.pacs`. The existing `DicomViewer` renders its returned imageIds unchanged.

4. **Polling, not webhooks.** Main process polls `GET /dicom-web/studies` every 2s, diffs against last known list, pushes new-study events to the renderer via IPC. This is a portable DICOMweb-standard operation (works against any vendor PACS, not just Orthanc). Orthanc's `/changes` endpoint is more efficient but Orthanc-specific, so we skip it.

---

## 4. File structure

### New — `electron/` (sibling of `web/` and `backend/`)

```
electron/
├── main.ts                       # app lifecycle, BrowserWindow, IPC handlers
├── preload.ts                    # contextBridge → window.pacs
├── orthanc-client.ts             # QIDO-RS + WADO-RS HTTP client (Node fetch)
├── orthanc-poller.ts             # polling loop, diff logic, emits 'studies-changed'
├── electron.vite.config.ts       # electron-vite build config
├── tsconfig.json
├── package.json                  # Electron-only deps (electron, electron-vite, electron-builder)
├── .env                          # ORTHANC_URL=http://localhost:8042 (overridable)
└── README.md                     # dev/run instructions
```

### Changes in `web/` (additive, web build unaffected)

```
web/src/
├── types/
│   ├── mode.types.ts             # add 'pacs' variant to RenderMode
│   └── pacs.types.ts             # new: PacsStudy, PacsStudyLoad, PacsApi shapes
├── context/
│   └── StudyContext.tsx          # add 'pacs' slot to the per-mode state Record
├── components/
│   └── Sidebar/
│       └── sidebar-items.tsx     # conditionally append PACS item if window.pacs
├── pages/
│   └── PacsPage/                 # new, parallel to BrowserOnlyPage/ServerBasedPage
│       ├── PacsPage.tsx
│       ├── hooks/usePacsStudy.ts
│       ├── hooks/usePacsStudyList.ts
│       └── types/index.ts
├── service/
│   └── pacs-ipc.service.ts       # wraps window.pacs; exposes a DicomSource
├── components/
│   └── StudyList/                # new: left-panel list of PACS studies (pure JSX)
│       ├── StudyList.tsx
│       └── types/index.ts
├── components/
│   └── AboutPanel/               # new: explainer copy for stakeholders
│       ├── AboutPanel.tsx
│       └── types/index.ts
└── vite-env.d.ts                 # declare window.pacs typings
```

**Responsibility per new file:**

- `electron/main.ts` — app lifecycle + IPC wiring. Never calls Orthanc directly.
- `electron/orthanc-client.ts` — pure HTTP client, no state. Functions: `listStudies()`, `listSeries(studyUID)`, `listInstanceUIDs(studyUID, seriesUID)`, `fetchInstance(studyUID, seriesUID, instanceUID)`.
- `electron/orthanc-poller.ts` — owns the polling interval + diff; emits callbacks on change.
- `electron/preload.ts` — exposes exactly three functions via contextBridge: `listStudies()`, `loadStudy(uid)`, `onStudiesChanged(cb)`.
- `web/src/service/pacs-ipc.service.ts` — browser-side wrapper providing a `DicomSource<string>` that delegates to `window.pacs.loadStudy`.
- `web/src/pages/PacsPage/hooks/usePacsStudy.ts` — per-mode data hook; parallel to `useBrowserStudy`, `useServerStudy`. Uses `StudyContext.states.pacs`.
- `web/src/pages/PacsPage/hooks/usePacsStudyList.ts` — subscribes to `window.pacs.onStudiesChanged` and exposes the live list.
- `web/src/components/StudyList/` — pure-JSX list.
- `web/src/components/AboutPanel/` — pure-JSX explainer, content sourced from `docs/todo-demo-ui-explainer.md`.

---

## 5. Data flow

### Happy path: user drops a DICOM into Orthanc, views it in Electron

```
 1. User drops sample.dcm into Orthanc's admin web UI (http://localhost:8042).

 2. Every 2 seconds, electron/orthanc-poller.ts calls
    GET http://localhost:8042/dicom-web/studies (QIDO-RS).

 3. Poller diffs the response against the previous list. Finds a new study.

 4. Poller's callback in main.ts sends IPC event 'pacs:studies-changed'
    with the full updated list to the renderer.

 5. In web/src/, PacsPage's usePacsStudyList receives the event (via
    window.pacs.onStudiesChanged) and updates its state. New study shows
    up in the StudyList panel.

 6. User clicks the study. usePacsStudy's loader calls
    window.pacs.loadStudy(studyUID).

 7. In main.ts, the IPC handler for 'pacs:load-study':
    a. orthanc-client.listSeries(studyUID)
    b. for each series: listInstanceUIDs
    c. for each instance: fetchInstance (raw DICOM bytes)
    d. encodes each as base64 data URL with `wadouri:` prefix
    e. returns { study, imageIds }

 8. pacsSource.load() receives { imageIds, metadata } and updates
    StudyContext.states.pacs.

 9. DicomViewer renders the imageIds (same component Browser mode uses).
```

### Error paths

- **Orthanc unreachable** (container not running): poller's fetch rejects; main emits `pacs:connection-error` IPC. Renderer shows a banner on PacsPage: "Can't reach Orthanc at http://localhost:8042. Is the container running?" with a retry button. Poller keeps retrying every 5s (backed off from 2s) until reachable; clears banner on first success.
- **Study has zero series/instances**: main returns `{ study, imageIds: [] }`; renderer shows "No renderable instances" placeholder in the viewer area.
- **WADO-RS fetch fails mid-download**: main throws; renderer catches via `pacsSource.load()`'s promise rejection and shows the error in the existing error-display slot.
- **User navigates away mid-load**: standard React cleanup in the study hook; main process completes its fetch but the result is discarded when it arrives.

---

## 6. The About panel (explainer UI)

Required for this phase because the demo's value depends on stakeholders understanding what Orthanc represents.

- Rendered in Electron only (no need in plain web).
- Linked from a `?` icon in the top-right of the Toolbar.
- Shows the two diagrams from §3 side by side (production vs hackathon), plus the swap-out table from `docs/todo-demo-ui-explainer.md`.
- Static content. No state, no API calls. Pure JSX.
- Copy is duplicated from `docs/todo-demo-ui-explainer.md` into the component — that file stays the source of truth for wording; the component is kept in sync at implementation time.

---

## 7. Portability — what's DICOMweb standard vs Orthanc-specific

Explicit to keep us honest about what ports to production.

| Operation we use | Standard? | Production equivalent |
|---|---|---|
| `GET /dicom-web/studies` (QIDO-RS) | ✅ DICOMweb standard | Works against any DICOMweb-compliant vendor PACS |
| `GET /dicom-web/studies/{uid}/series` (QIDO-RS) | ✅ Standard | Portable |
| `GET /dicom-web/studies/{uid}/series/{uid}/instances` (QIDO-RS) | ✅ Standard | Portable |
| `GET /dicom-web/studies/{uid}/series/{uid}/instances/{uid}` (WADO-RS) | ✅ Standard | Portable |
| Polling every 2s | Hackathon shortcut | In production, vendor software pushes to Copilot via DIMSE C-STORE or STOW-RS (Copilot-as-Storage-SCP — out of scope for this phase) |
| Orthanc web UI for uploads | Demo-only | In production, vendor software auto-exports after X-ray capture |
| `http://localhost:8042` hardcoded (overridable via env) | Demo | In production, Copilot settings UI lets an admin point at the clinic's PACS endpoint with credentials |

---

## 8. Testing strategy

Hackathon-pragmatic, same as Phases 1 and 2.

### Automated — TypeScript (Vitest)
- `electron/orthanc-client.test.ts` — unit tests for the HTTP client using mocked fetch. ~4 tests: listStudies parses QIDO-RS, fetchInstance extracts multipart body, error on 404, URL construction.
- `electron/orthanc-poller.test.ts` — unit tests for the diff logic using fake studies. ~3 tests: new study detected, removed study detected, unchanged list emits nothing.
- `web/src/service/pacs-ipc.service.test.ts` — verifies it throws when `window.pacs` is unavailable (ensures it never accidentally runs in plain browser).

### Manual smoke (`docs/TESTING.md`)
```
[ ] Phase 3: Docker-run Orthanc; npm run electron:dev; window opens
[ ] Sidebar shows three items (Browser only, Server based, PACS)
[ ] Web app in a regular browser still shows only two items (regression)
[ ] Drop samples/dental-pano.dcm into Orthanc UI → appears in PACS list within ~3s
[ ] Click it → renders in viewer with correct metadata
[ ] Drop samples/mri-knee/series-000001/ into Orthanc → appears as a study with 24 instances; scrubber works
[ ] Switch to Browser only, drop a local file → renders (regression)
[ ] Switch to Server based, backend running on :5050 → renders (regression)
[ ] Switch back to PACS → previously-loaded study still there (state preservation)
[ ] Stop Orthanc container → banner appears saying unreachable; restart → banner clears
[ ] About panel accessible from ? icon; content matches docs/todo-demo-ui-explainer.md
```

### Not automated
- Full E2E with a live Orthanc — too much setup for the ROI at hackathon scale.
- Electron packaging/signing — out of scope.

---

## 9. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | Docker not available on demo laptop | Phase 3 unusable | Install + test on actual demo machine ≥1 day prior. Fallback: run Orthanc natively (Mac brew install exists but less tested). |
| 2 | Electron bundler complexity with web/src/ as renderer | Build fails | `electron-vite` has first-class multi-project support. First implementation task is a "hello world" Electron that loads web/src/ — prove before touching Orthanc. |
| 3 | Base64 data-URL transport gets memory-heavy for large series | Slow render / browser OOM | Fine for a 24-slice MRI series. Documented as a production concern. Future: use blob streaming or disk caching. |
| 4 | Orthanc CORS warning log noise | Cosmetic only | Since we route through Electron main, browsers never talk to Orthanc directly, so CORS issues don't occur in practice. If they do, silence via Orthanc's logging config. |
| 5 | Polling every 2s loads Orthanc | None at hackathon scale | One request every 2s is trivial. Documented for production replacement (push via C-STORE). |
| 6 | Three sidebar modes confuse users | UX confusion | About panel. Also the PACS item appears only in Electron where it's expected. |

---

## 10. Open questions

None. All architecture decisions resolved during the brainstorming session:

- Electron vs web + backend-proxy: **Electron.**
- Web app gets PACS mode too: **no** (scope-capped).
- Server-sent events from .NET: **no** (web doesn't get PACS, so no SSE needed).
- Polling mechanism: **`/dicom-web/studies` QIDO-RS diff** (portable DICOMweb standard, not Orthanc's `/changes`).
- Electron packaging for the demo: **no** (dev mode only).

---

## 11. Next step

Once this spec is approved, invoke `superpowers:writing-plans` to generate the step-by-step implementation plan for this phase. The plan will supersede the original `docs/superpowers/plans/2026-04-13-phase-3-electron-orthanc.md`.
