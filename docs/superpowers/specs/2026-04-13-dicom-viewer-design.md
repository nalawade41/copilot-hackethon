# Design: DICOM Viewer for Copilot (Hackathon)

**Status:** Approved — ready for implementation planning
**Date:** 2026-04-13
**Owner:** Mahesh Nalawade
**Context:** EAssist Copilot (Electron + React + .NET) needs to display DICOM X-ray images. Currently, DICOM files cannot be rendered directly in the existing Electron app.

> **Path note (post-restructure):** The front-end has since been moved to `web/`. Every `src/...` reference below now lives at `web/src/...`. Every `samples/...` reference still resolves to `<repo>/samples/` (shared fixtures — not moved into web/).

---

## 1. Goals

### Minimal (hackathon starting goal)
Take a DICOM image and render it in a viewer that stakeholders can be shown.

- Shareable standalone React web app (no install; URL or local dev server).
- Handles both data sets on hand:
  - **Single-frame dental panoramic X-ray** (the production-like case: `image-000001.dcm`, modality `PX`, uncompressed).
  - **Multi-frame MRI series** (test data: `series-000001/…`, modality `MR`, JPEG Lossless compressed).
- Frontend-only processing (no backend required to render).

### Secondary
Demonstrate the **backend-assisted path** with .NET + fo-dicom, so both architecture options are validated.

### Stretch
Simulate the **full sensor→Copilot flow** end-to-end using DICOM standards, packaged in a standalone Electron app (because the real Copilot is Electron, and because network/filesystem integration is easier outside a browser sandbox).

---

## 2. Non-goals

- No production-grade DICOM viewer features (measurements, MPR, hanging protocols, annotations, reporting).
- No authentication, user management, audit logging.
- No persistence across server restarts (Phase 2 backend is in-memory only).
- No integration into the existing Copilot codebase. This is a standalone prototype.
- No real sensor hardware integration. Stretch simulates the *imaging-software-to-Copilot* hop only.
- No support for 3D CBCT volume rendering, MPR, or advanced modalities beyond 2D image display.

---

## 3. Architecture overview — phased delivery

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1 (MINIMAL) — Frontend-only stack viewer                 │
│  React SPA · Cornerstone3D · runs in browser · static deploy    │
│  Handles:   • root dental pano (single, uncompressed)           │
│             • MRI series folders (multi-file, JPEG Lossless)    │
│  Demo:      share URL with stakeholders                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2 — Backend-assisted mode (.NET + fo-dicom)              │
│  Same React SPA, adds a mode toggle: "client" vs "server"       │
│  Server parses DICOM → PNG stream → <img> in React              │
│  Demo:      shows both paths working side-by-side               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3 (STRETCH) — Electron + simulated sensor→app flow       │
│  Same React app, packaged in Electron.                          │
│  Simulates: X-ray software ──(DICOMweb/folder)──▶ Copilot       │
│  Commitment: Orthanc (free open-source PACS) as the            │
│             "imaging software" — protocol-accurate demo         │
│  Fallback:  folder-watcher (emergency only, not planned work)   │
└─────────────────────────────────────────────────────────────────┘
```

**Key principle:** every phase reuses the React/Cornerstone viewer component from Phase 1. Phase 2 swaps the data source. Phase 3 adds an Electron wrapper + a network/filesystem data source. **The viewer itself never gets rewritten.**

### The `DicomSource` abstraction (load-bearing decision)

The viewer component never receives `File[]` directly — it receives `imageIds: string[]`. A source module turns inputs into imageIds. This is the single architectural decision that makes phased delivery work.

```
Phase 1: file-source.ts     (browser File → wadouri: blob URLs)
Phase 2: server-source.ts   (POST to .NET → frame URLs)
Phase 3: pacs-source.ts     (DICOMweb URLs from Orthanc, via Electron IPC)
Phase 3: watch-source.ts    (filesystem watcher, via Electron IPC)  [fallback]
```

All implement the same `DicomSource` interface. The viewer is source-agnostic.

---

## 4. Phase 1 — Frontend-only viewer

### Tech stack
- **Vite** + **React 18** + **TypeScript**
- **Cornerstone3D**: `@cornerstonejs/core`, `@cornerstonejs/dicom-image-loader`, `@cornerstonejs/tools`
- No state management library (React `useState` is enough)
- **Styling for a modern, polished look:** Tailwind CSS + a small set of primitives (e.g., Radix UI primitives or shadcn/ui components) — chosen at implementation time. Dark theme as the default (standard in medical imaging viewers and keeps image contrast readable). Clean typography (Inter or similar), tasteful spacing, subtle animations. Visual polish is a stated requirement even though Copilot branding is not.

### Project layout

```
copilot-hackethon/
├── samples/                              ← sample DICOM files
│   ├── dental-pano.dcm                   (renamed from image-000001.dcm)
│   └── mri-knee/series-000001/*.dcm      (one series is enough for demo)
├── src/
│   ├── main.tsx                          ← Vite entry
│   ├── App.tsx                           ← layout shell
│   ├── components/
│   │   ├── FileDropZone.tsx              ← drag-drop + file/folder picker
│   │   ├── DicomViewer.tsx               ← Cornerstone3D canvas + toolbar
│   │   ├── SliceScrubber.tsx             ← slider shown only when stack > 1
│   │   └── MetadataPanel.tsx             ← collapsible; shows modality, body part, etc.
│   ├── lib/
│   │   ├── cornerstone-init.ts           ← one-time engine + loader init
│   │   ├── dicom-source.ts               ← abstract DicomSource interface
│   │   └── file-source.ts                ← Phase 1 source: File[] → imageIds
│   └── types.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Component tree

```
<App>
├── <FileDropZone>            ← hidden once loaded; also "Open" button
├── <DicomViewer>             ← the main canvas
│   ├── <Toolbar>             ← reset, zoom-fit, window/level toggle, pan toggle
│   ├── <CornerstoneCanvas>   ← the Cornerstone3D viewport (ref-attached div)
│   └── <SliceScrubber>       ← only rendered when stack has > 1 image
└── <MetadataPanel>           ← toggleable; 5-6 fields
```

### Data flow — the happy path

1. User drops file(s) or folder onto `<FileDropZone>`.
2. `file-source.ts` builds one `imageId` per file: `wadouri:<blob-url>`.
3. Mode detection: 1 file → single-image; >1 file → stack with scrubber.
4. `<DicomViewer>` calls `viewport.setStack(imageIds)` + `viewport.render()`.
5. User interactions: mouse drag = pan, wheel = zoom, ctrl/cmd+drag = window/level, stack-scroll = change slice.

### Metadata shown in `<MetadataPanel>`
Parsed via `dicomParser` (already a Cornerstone dependency). Displayed fields:
- `PatientName`, `PatientID` (if present)
- `Modality`
- `BodyPartExamined`
- `StudyDate`
- `Manufacturer`

### Design choices worth flagging
1. `DicomSource` abstraction — described in §3.
2. Cornerstone init happens exactly **once**, in `cornerstone-init.ts`, before React mounts.
3. **Single viewport**, not multi-panel. One image at a time. Simpler.
4. **No state management library**. `useState` + prop drilling suffice for this component count.
5. **Metadata minimal** — 5-6 fields, not all ~2000 DICOM tags.

---

## 5. Phase 2 — Backend-assisted mode (.NET + fo-dicom)

### Goal
Demonstrate the alternate architecture: .NET parses DICOM, renders pixels, frontend shows `<img>`. Same React viewer, different data source.

### What the backend does
- `POST /api/dicom/upload` — accept a `.dcm` file (multipart)
- Parse with [`fo-dicom`](https://github.com/fo-dicom/fo-dicom) (handles uncompressed + JPEG Lossless + most standard transfer syntaxes)
- Render each frame to PNG via `DicomImage.RenderImage()`
- Return JSON: `{ studyId, frameCount, frameUrls[], metadata }`
- `GET /api/dicom/{studyId}/frame/{index}` — serves PNG bytes

### What it explicitly doesn't do
- No database. In-memory `Dictionary<Guid, Study>`, evicted on shutdown.
- No auth. Hackathon demo only.
- No persistence across restarts.

### Stack
- **ASP.NET Core 8 Minimal API** (~100 lines in `Program.cs`, no MVC scaffolding)
- **fo-dicom** for parse + render
- CORS enabled for `http://localhost:5173`

### Project additions

```
backend/
└── CopilotDicom.Api/
    ├── Program.cs                 ← minimal API
    ├── Services/DicomService.cs   ← parse, render, cache
    ├── Models/Study.cs
    └── CopilotDicom.Api.csproj

src/lib/
└── server-source.ts               ← new DicomSource implementation
```

### API sketch

```http
POST /api/dicom/upload
Content-Type: multipart/form-data
  file: <.dcm binary>

→ 200 OK
{
  "studyId": "f7e3-...-9a1b",
  "frameCount": 1,
  "frameUrls": ["/api/dicom/f7e3.../frame/0"],
  "metadata": {
    "modality": "PX",
    "bodyPart": "Jaw region",
    "manufacturer": "Instrumentarium Dental",
    "studyDate": "20160330"
  }
}

GET /api/dicom/{studyId}/frame/{index}
→ 200 OK, Content-Type: image/png
```

### Mode toggle

Small UI switch in the header:

```
[ Client rendering (Cornerstone) ] ⟷ [ Server rendering (.NET) ]
```

The app swaps `DicomSource` based on the toggle. Cornerstone3D can render pre-rendered PNGs (via `web:` imageIds or an `<img>` fallback), so the same viewport works either way.

**Accepted trade-off:** server mode loses client-side window/level (no raw pixel data on the frontend); keeps pan/zoom. The *point* of Phase 2 is to demonstrate the .NET path works — not to match Cornerstone interactivity.

### Multi-file series

For MRI: client uploads files one at a time; backend groups by `SeriesInstanceUID`. ZIP upload is a possible simplification but not required for the hackathon.

---

## 6. Phase 3 — Electron + simulated sensor→app flow (stretch)

### The simulation boundary

Real flow:
```
[Sensor hardware] → [Imaging software / PACS] → [Copilot]
```
The first hop uses vendor-specific drivers and isn't reproducible without hardware. We simulate the **second hop** — the DICOM-over-standards hop, which is where the interesting integration story lives.

### Primary path — Orthanc as the simulated imaging software/PACS

[Orthanc](https://www.orthanc-server.com/) is a free, open-source, cross-platform PACS. Speaks DIMSE (classic DICOM over TCP) and DICOMweb (STOW-RS / QIDO-RS / WADO-RS over HTTP). Run locally via Docker:

```bash
docker run -p 4242:4242 -p 8042:8042 jodogne/orthanc-plugins
```

**Why Orthanc:**
- Uses the same protocols real dental imaging vendors (Carestream, Planmeca, Dolphin, etc.) use. If Copilot can talk to Orthanc, it can talk to them.
- Free; no trial-software hunt.
- Nice web admin UI for the "tech imports the scan" moment in the demo.

### Flow

```
┌──────────────────────┐                    ┌──────────────────────┐
│  Orthanc (local)     │                    │  Copilot (Electron)  │
│  simulating the      │                    │                      │
│  imaging software    │                    │  React viewer from   │
│  docker, port 8042   │                    │  Phase 1 +           │
│                      │                    │  DICOMweb source     │
│  Admin UI: upload    │                    │                      │
│  sample.dcm via      │  ──── QIDO-RS ───→ │  list studies        │
│  web drag-drop       │                    │                      │
│  (simulates tech     │  ──── WADO-RS ───→ │  fetch pixels        │
│   importing from     │                    │                      │
│   sensor)            │                    │                      │
└──────────────────────┘                    └──────────────────────┘
```

### Demo script
1. Open Electron Copilot. Empty state: "No studies yet."
2. Separate window: drag `sample.dcm` into Orthanc web UI (the "tech imports from sensor" moment).
3. Copilot auto-refreshes (2s polling) → new study appears in the study list.
4. Click it → renders in the Cornerstone viewer from Phase 1.

### Why Electron (not browser)
- **CORS.** Orthanc CORS config is fragile; Electron main process uses Node `fetch` with no CORS restrictions.
- **Story alignment.** Real Copilot is already Electron.
- **Future headroom.** Filesystem watchers, native menus, notifications, auto-updating — all cheap once in Electron.

### Electron architecture

```
┌─────────────────────────────────────────────┐
│ Electron main process (Node)                │
│ ├── Orthanc client (Node fetch → localhost) │
│ ├── Polling loop (QIDO-RS every 2s)         │
│ └── IPC bridge to renderer                  │
├─────────────────────────────────────────────┤
│ Electron renderer                           │
│ └── Same React SPA from Phases 1 & 2 +      │
│     pacs-source.ts (reads study list       │
│     from main via IPC)                      │
└─────────────────────────────────────────────┘
```

Packaging via `electron-builder` is **not required for the hackathon demo**. Run `npm run electron:dev` live.

### Phase 3 commitment & sequencing

**Protocol-accurate path is the commitment.** Orthanc + DICOMweb is the primary (and only planned) stretch deliverable. The demo story is the DICOM protocol story — swapping it for a folder-watcher undercuts the whole narrative.

Sequencing inside Phase 3:
1. Stand up Orthanc locally and verify DICOMweb endpoints work with a `curl` smoke test.
2. Wrap the Phase 1/2 React app in Electron.
3. Implement `pacs-source.ts` (DICOMweb) via Electron main-process fetch + IPC.
4. Polling loop for new studies.
5. End-to-end: drop `.dcm` into Orthanc UI → appears in Copilot.

### Emergency fallback — folder watcher (last resort only)

If — and only if — Orthanc proves unusable on the demo machine within ~24h of demo time, fall back to a folder watcher (`~/XRaySensorOutput/`) so there is *some* stretch demo. This is **not** planned work; it exists as a panic option. Do not build it speculatively.

### Phase 3 risks
- **Orthanc/Docker setup friction on demo machine.** Test early on the actual demo laptop.
- **CORS.** Mitigated by routing everything through Electron main process.
- **Electron packaging complexity.** Avoid — run dev mode for the demo.

---

## 7. Testing strategy

Hackathon-pragmatic. Focused automation on the critical abstraction, manual smoke script for the rest.

### Automated — frontend (Vitest + React Testing Library), ~5-8 tests
- `file-source.ts`: `File[] → imageId[]`; single vs stack detection.
- **Shared `DicomSource` contract test** run against every implementation (file-source, server-source, pacs-source). New source that passes this = works with the viewer.
- `MetadataPanel`: renders expected fields; handles missing fields gracefully.
- `<DicomViewer>`: mount/unmount cleans up cornerstone viewport (no leaks between tests).

### Automated — backend (xUnit + fo-dicom), ~3-4 tests
- Parse `dental-pano.dcm` → `Modality == "PX"`, body part contains "Jaw".
- Parse one MRI slice → `Modality == "MR"`; rendered PNG bytes non-empty.
- Upload endpoint returns expected JSON shape.
- Nonexistent `studyId` → 404.

### Not automated
- Full E2E (Playwright) — too much setup for ROI.
- Electron shell — ~50 lines of glue; covered by manual smoke.
- Orthanc integration — covered by manual smoke script.

### Manual smoke script (`docs/TESTING.md`)
```
[ ] Phase 1: Drop samples/dental-pano.dcm → renders; metadata shows "PX / Jaw region"
[ ] Phase 1: Drop samples/mri-knee/series-000001/ folder → renders slice 0;
             scrubber appears; mouse-wheel scrolls through 20 slices
[ ] Phase 1: Pan (drag), zoom (wheel), window/level (ctrl+drag) all work
[ ] Phase 2: Toggle "server rendering" → dental-pano renders via .NET backend
[ ] Phase 3: Upload .dcm via Orthanc UI → Copilot (Electron) shows it within 3s

Only if the emergency folder-watcher fallback was activated:
[ ] Phase 3 (fallback): Drop .dcm into ~/XRaySensorOutput/ → Copilot picks it up
```

### Test data
Samples committed to git under `samples/`:
- `samples/dental-pano.dcm` — uncompressed single-frame (source: `dicomlibrary-100`, public)
- `samples/mri-knee/series-000001/` — JPEG Lossless compressed stack (source: `dicomlibrary-100`, public)

Both cases covered by at least one unit test.

### CI
Out of scope for the hackathon. Documented as future work.

---

## 8. Risks & mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | Cornerstone3D bundle ~2-3 MB with codecs | Slow first-load | Accept for hackathon; lazy-load codecs if annoying |
| 2 | WebGL/WebGPU quirks on demo laptop | Viewer fails at demo time | Smoke-test on actual demo machine ≥1 day prior |
| 3 | Real-world compression variability (JPEG 2000, RLE) | Future files fail to render | Cornerstone-dicom-image-loader bundles all standard codecs; document which transfer syntaxes are verified |
| 4 | Phase 3 time overrun (Orthanc path) | No stretch demo | Scope Phase 3 tightly: Electron shell + DICOMweb source + study list. Defer anything beyond the demo script. Folder-watcher fallback exists only as a last-resort panic option. |
| 5 | Demo reliability (live demos break) | Bad demo | Record screen-capture backup of each phase working |
| 6 | Electron packaging complexity | Wasted time on build tooling | Use `npm run electron:dev` for the demo; skip `electron-builder` |
| 7 | CORS on Orthanc from Electron renderer | Stretch demo blocked | Route all Orthanc HTTP from Electron main process |
| 8 | PHI in sample files | Accidental commit of patient data | Samples are from public `dicomlibrary-100`; `.gitignore` rule for ad-hoc `.dcm` files outside `samples/` |

---

## 9. Resolved decisions

All 5 open questions from the brainstorming session are resolved.

1. **Polish level — resolved.** Standalone UI does **not** need to match the real Copilot's look, but should be **modern and visually polished** — clean typography, tasteful spacing, a coherent dark theme is a good default for medical imaging viewers.
2. **Copilot branding — resolved.** None. Neutral, unbranded UI is fine.
3. **Shareable URL hosting — resolved.**
   - **Frontend:** Vercel (Vite static build deploys cleanly via `vercel deploy` or GitHub integration).
   - **Backend (Phase 2):** No preferred free hosting confirmed. Fallback plan is **AWS Lambda + API Gateway** (ASP.NET Core 8 Minimal API can run on Lambda via the `Amazon.Lambda.AspNetCoreServer` adapter). For the hackathon we may simply run the backend locally during demos and document the AWS path as future work — decide at implementation time.
4. **Phase 3 priority — resolved.** **Protocol-accurate path (Orthanc + DICOMweb) is the commitment**, not the folder-watcher. Folder-watcher is demoted to *optional emergency fallback only if Orthanc proves unusable the day before demo* — it is **not** the "ship first" path.

5. **Team size and timeline — resolved (not a constraint).** User indicated not to worry about team size. Implementation plan is structured around discrete, sequentially orderable steps rather than calendar days, so team size can scale up or down without restructuring the plan.

---

## 10. Appendix — known facts about the sample data

### `samples/dental-pano.dcm` (to be renamed from `image-000001.dcm`)
- SOP Class UID: `1.2.840.10008.5.1.4.1.1.1.1` — Digital X-Ray Image, For Presentation
- Modality: `PX` (Panoramic X-Ray)
- Transfer Syntax UID: `1.2.840.10008.1.2` (Implicit VR Little Endian — uncompressed)
- Body Part: "Jaw region"
- Manufacturer: Instrumentarium Dental, model OP300
- Size: 8.2 MB, single frame
- Matches the production-like EAssist dental use case

### `samples/mri-knee/series-000001/…` (24 files)
- Modality: `MR` (MRI)
- Transfer Syntax UID: `1.2.840.10008.1.2.4.70` (JPEG Lossless, Non-Hierarchical, First-Order Prediction — compressed)
- Body Part: Knee (Right), AX. FSE PD sequence
- Source: `dicomlibrary-100` (public test set)
- Multi-frame volumetric series; used to exercise stack-scroll + compressed pixel decode

---

## 11. Next step

Once this spec is approved, move to implementation planning via the `superpowers:writing-plans` skill.
