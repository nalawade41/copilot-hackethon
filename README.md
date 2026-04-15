# Copilot — DICOM Viewer (Hackathon POC)

A working end-to-end proof of concept for receiving and displaying dental DICOM images in EAssist Copilot. Covers all three industry-standard clinic-integration protocols (DIMSE C-STORE, STOW-RS, DICOMweb QIDO/WADO) with a browser viewer, a .NET conversion backend, and an Electron desktop app.

This README is the **technical team's map** of the repo: what runs where, how the pieces connect, and where to go to change a specific behavior.

---

## Table of contents

- [High-level architecture](#high-level-architecture)
- [Repo layout](#repo-layout)
- [Components in detail](#components-in-detail)
  - [web/](#web--react--vite--cornerstone3d)
  - [backend/](#backend--net-8--fo-dicom)
  - [electron/](#electron--desktop-app)
  - [orthanc/](#orthanc--gateway-pacs)
  - [orthanc-vendor-sim/](#orthanc-vendor-sim--simulated-vendor-pacs)
- [Viewer modes & data flow](#viewer-modes--data-flow)
- [Protocols](#protocols)
- [Study tagging convention](#study-tagging-convention)
- [Environment variables](#environment-variables)
- [Deployment map](#deployment-map)
- [Local development](#local-development)
- [Testing](#testing)
- [Desktop app builds](#desktop-app-builds)
- ["Where do I change X?" cheat sheet](#where-do-i-change-x-cheat-sheet)
- [Known caveats](#known-caveats)

---

## High-level architecture

Five independent pieces, split across two clients (web + desktop) and three servers (backend + two Orthanc instances):

```
                  ┌──────────────────────────────────────────────┐
                  │                 CLIENTS                       │
                  │                                               │
                  │   ┌──────────────┐       ┌──────────────┐    │
                  │   │  Web (Vite)  │       │  Electron    │    │
                  │   │  Vercel      │       │  Desktop App │    │
                  │   │              │       │  (Mac / Win) │    │
                  │   └──────┬───────┘       └──────┬───────┘    │
                  └──────────┼──────────────────────┼────────────┘
                             │                      │
                 ┌───────────┘                      └─────────┐
                 │                                            │
                 ▼                                            ▼
        ┌─────────────────┐                        ┌──────────────────┐
        │  .NET Backend   │                        │ Gateway Orthanc  │
        │  (fo-dicom)     │                        │ DICOMweb / DIMSE │
        │  Railway        │                        │ / STOW-RS        │
        │                 │                        │ Railway          │
        │ Server mode:    │                        │                  │
        │ DCM → PNG       │                        │ HTTP  :8042      │
        │                 │                        │ TCP   :4242      │
        └─────────────────┘                        └────────▲─────────┘
                                                            │
                                                DIMSE + STOW-RS
                                                  (auto-forward)
                                                            │
                                                  ┌─────────┴────────┐
                                                  │  Vendor Sim      │
                                                  │  Orthanc         │
                                                  │  (Lua script)    │
                                                  │  Railway         │
                                                  │                  │
                                                  │  Simulates       │
                                                  │  clinic imaging  │
                                                  │  software        │
                                                  └─────────▲────────┘
                                                            │
                                                  Stakeholder uploads
                                                  .dcm via admin UI
                                                  (= "X-ray captured")
```

Flow for the push demos:
1. Stakeholder uploads a `.dcm` file to the Vendor Sim Orthanc's admin UI.
2. Vendor Sim's Lua script fires `OnStableStudy`, tags the study's description with the protocol name, and pushes the modified copy to the Gateway twice — once via DIMSE C-STORE (TCP), once via STOW-RS (HTTPS).
3. The desktop app is polling the Gateway via DICOMweb every 2 seconds. It picks up both copies and renders them.
4. The three sidebar items (DICOMweb Poll / DIMSE C-STORE / STOW-RS) filter the study list by description tag so each protocol gets its own tab.

Flow for the polling demo:
1. Stakeholder uploads directly to the **Gateway** Orthanc.
2. Desktop app finds it on its next 2-second poll. Studies without a protocol tag are shown as `[DICOMweb (Poll)]`.

---

## Repo layout

```
copilot-hackethon/
├── web/                  # React + Cornerstone3D front-end (Vite)
├── backend/              # .NET 8 Minimal API + fo-dicom
├── electron/             # Electron wrapper + PACS IPC surface
├── orthanc/              # Gateway Orthanc (Copilot's cloud receiver)
├── orthanc-vendor-sim/   # Vendor Sim Orthanc (simulates DEXIS/Carestream/etc.)
├── samples/              # Public de-identified DICOM test fixtures
└── docs/                 # Design specs and phase plans
```

Each app folder is self-contained — its own `package.json` / `.csproj` / `Dockerfile` — and has its own README with component-specific details.

---

## Components in detail

### `web/` — React + Vite + Cornerstone3D

The front-end. Runs in a plain browser (Vercel deploy) and as Electron's renderer (no conditional builds).

**Stack:** React 18, Vite, TypeScript, TailwindCSS, Cornerstone3D v2.19, vitest + RTL.

**Key directories:**
- `src/App.tsx` — providers + `Layout`
- `src/main.tsx` — Cornerstone init + mount
- `src/components/` — presentational components, one folder each
- `src/pages/` — one folder per page (`BrowserOnlyPage`, `ServerBasedPage`, `PacsPage`, `AboutPage`)
- `src/context/` — `ModeContext`, `StudyContext`, `MetadataPanelContext`
- `src/service/` — API layers (`dicom-api.service.ts` for backend, `pacs-ipc.service.ts` for Electron)
- `src/lib/utility/` — pure helpers (metadata extraction, file sources, download)

**Runtime detection:** `window.pacs` is injected only by Electron's preload script. That's the single switch for "are we in desktop mode?" — it controls sidebar items, page availability, and service layer picks.

### `backend/` — .NET 8 + fo-dicom

Stateless conversion backend. Accepts DICOM uploads, renders each frame to a PNG via `fo-dicom` + `ImageSharp`, and returns URLs to the PNG frames. Used by "Server based" mode.

**Endpoints:**
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/dicom/upload` | Multipart `file` → JSON `{ studyId, frameCount, frameUrls[], metadata }` |
| `GET`  | `/api/dicom/{studyId}/frame/{index}` | PNG bytes |
| `GET`  | `/api/health` | `{"status":"ok"}` |

**Key files:**
- `Program.cs` — minimal API pipeline + DI + CORS
- `Services/DicomService.cs` — all conversion logic
- `Models/` — records for responses

**Caveats:**
- Study cache is in-memory (`ConcurrentDictionary`) — cleared on restart.
- CORS is wide-open for the hackathon.
- **Server mode strips DICOM metadata** — PNG preserves only pixel data. See the "Points to ponder" section of the About page for the hybrid-storage discussion.

### `electron/` — Desktop app

Electron wrapper. Loads the built `web/dist` as its renderer and exposes a `window.pacs` IPC surface for Orthanc access (DIMSE polling, study fetch).

**Key files:**
- `src/main.ts` — app bootstrap, `BrowserWindow`, env loading
- `src/preload.ts` — exposes `window.pacs` to the renderer
- `src/ipc/` — IPC handler registrations
- `src/orthanc/` — Orthanc client (DICOMweb QIDO/WADO) + poller
- `scripts/build.sh` — end-to-end pipeline (web build → copy → package → stage into `web/public/release/`)
- `scripts/copy-renderer.js` — copies `web/dist` into `electron/renderer/`

**Build toolchain:**
- `esbuild` for main + preload (fast, no config pain)
- `electron-builder` for platform packaging (`.dmg` on Mac, NSIS `.exe` on Windows)

**Why esbuild over electron-vite:** we hit repeated issues with electron-vite's renderer entry resolution when the renderer is an external `web/` build. esbuild + a manual copy is simpler and explicit.

### `orthanc/` — Gateway PACS

The **Copilot cloud receiver**. Single Orthanc instance exposing all three receive paths:

| Port | Protocol | Purpose |
|---|---|---|
| HTTP 8042 | DICOMweb (QIDO/WADO) | Polled by Electron every 2 seconds |
| HTTP 8042 | STOW-RS | HTTP push endpoint (vendor sim pushes here) |
| TCP  4242 | DIMSE C-STORE | Classic TCP push endpoint |
| HTTP 8042 | Admin UI        | Used for the "DICOMweb Poll" demo (direct upload) |

On Railway: HTTP proxy → port 8042, TCP proxy → port 4242. Both must be exposed.

**Key files:**
- `orthanc.json` — ports, DICOMweb plugin config, `DicomAlwaysAllowEcho/Store: true`, `StableAge: 5`
- `Dockerfile` — `jodogne/orthanc-plugins:latest` base
- `start.sh` — simple `exec Orthanc /etc/orthanc/orthanc.json` (no port rewriting, relies on `PORT` env var being set to `8042` in Railway)
- `README.md` — full production hardening checklist

### `orthanc-vendor-sim/` — Simulated vendor PACS

Second Orthanc instance that mimics a real clinic imaging vendor (DEXIS, Carestream, Sidexis, Planmeca, etc.). Auto-forwards every uploaded study to the Gateway via **both** push protocols.

**Key files:**
- `orthanc.json` — includes `DicomModalities` (Gateway as DIMSE target) + `OrthancPeers` (Gateway as STOW target)
- `autoforward.lua` — the meat of the demo:
  - Fires on `OnStableStudy`
  - **Recursion guard:** skips studies whose description already contains a protocol tag (prevents infinite loop on the modified copies)
  - Modifies study description with `[DIMSE C-STORE (TCP)]` prefix → synchronous push via `POST /modalities/copilot-gateway-dimse/store`
  - Repeats with `[STOW-RS (HTTP)]` prefix → synchronous push via `POST /peers/copilot-gateway-http/store`
  - Uses synchronous REST API (not the async `SendToModality` helper) because the async path hit "Unknown resource" races
- `start.sh` — same shape as gateway

No inbound DIMSE port — the sim only needs HTTP (admin UI + outbound Lua pushes).

---

## Viewer modes & data flow

All modes use the same Cornerstone3D viewer. The difference is where the DICOM bytes come from.

| Mode | Client | Source | Transport | Notes |
|---|---|---|---|---|
| Browser only | Web + Desktop | User's local file picker | None (in-memory) | Cornerstone parses bytes directly |
| Server based | Web + Desktop | User's local file picker | `POST` to .NET backend, returns PNG URLs | **Metadata lost** (PNG only) |
| DICOMweb Poll | Desktop only | Gateway Orthanc | QIDO-RS list every 2s, WADO-RS fetch on select | Electron's `window.pacs` |
| DIMSE C-STORE | Desktop only | Gateway Orthanc | Same QIDO/WADO as above | Filtered by `[DIMSE C-STORE (TCP)]` tag |
| STOW-RS | Desktop only | Gateway Orthanc | Same QIDO/WADO as above | Filtered by `[STOW-RS (HTTP)]` tag |

The three PACS modes share one data source (Gateway Orthanc's DICOMweb endpoint). The **sidebar filter** is what separates them — see [web/src/pages/PacsPage/hooks/usePacsStudyList.ts:18-32](web/src/pages/PacsPage/hooks/usePacsStudyList.ts#L18-L32).

---

## Protocols

| Protocol | Direction | Transport | Coverage | Clinic setup | Copilot setup |
|---|---|---|---|---|---|
| DIMSE C-STORE | Clinic → Copilot | TCP | ~100% (universal, since 1993) | Add Copilot as DICOM destination — hostname + port + AE Title | Expose public TCP endpoint |
| STOW-RS | Clinic → Copilot | HTTP | ~50–60% (modern PACS) | Add Copilot's HTTPS URL as STOW endpoint | Expose public HTTPS endpoint |
| DICOMweb QIDO/WADO | Copilot → Clinic (poll) | HTTP | ~50–60% (modern PACS) | **None** — share PACS URL | Add clinic's PACS URL in settings |

Supporting all three lets Copilot onboard any clinic in the dental market — modern ones via HTTP, older ones via DIMSE.

---

## Study tagging convention

Every study in the Gateway carries a protocol marker in its `StudyDescription` (tag `0008,1030`). This is how we filter per-mode in the UI.

| Tag | Source | Set by |
|---|---|---|
| `[DIMSE C-STORE (TCP)] <original>` | Vendor Sim → DIMSE push | `autoforward.lua` (Vendor Sim) |
| `[STOW-RS (HTTP)] <original>` | Vendor Sim → STOW push | `autoforward.lua` (Vendor Sim) |
| `[DICOMweb (Poll)]` (UI-only fallback) | Direct upload to Gateway | `pacs-ipc.service.ts` display layer — empty descriptions are labeled this way when shown in the metadata panel |

The description is also used for the `UI filter` in the desktop app — see [web/src/pages/PacsPage/hooks/usePacsStudyList.ts](web/src/pages/PacsPage/hooks/usePacsStudyList.ts).

**To change the tag strings:** update them in **both** `orthanc-vendor-sim/autoforward.lua` AND `web/src/pages/PacsPage/hooks/usePacsStudyList.ts` (the constants must match exactly).

**Note on QIDO:** the default QIDO-RS response does NOT include `StudyDescription`. The Electron client adds `?includefield=00081030` — see [electron/src/orthanc/client.ts:54](electron/src/orthanc/client.ts#L54).

---

## Environment variables

### `web/.env`

```bash
VITE_SERVER_URL=http://localhost:5050                                        # .NET backend
VITE_ORTHANC_URL=https://copilot-hackethon-production.up.railway.app        # Gateway (where Copilot polls)
VITE_VENDOR_SIM_URL=https://copilot-vendor-sim-production.up.railway.app    # Vendor sim (shown as upload target)
```

### `electron/.env`

```bash
ORTHANC_URL=https://copilot-hackethon-production.up.railway.app  # Gateway — same as web
ORTHANC_USER=
ORTHANC_PASSWORD=
```

### Railway (gateway service)

```bash
PORT=8042   # must match orthanc.json HttpPort
```

The `PORT` env var is critical — Railway's HTTP proxy targets it. If unset, Railway may auto-pick a different port and HTTP will 502.

### Railway (vendor sim service)

```bash
PORT=8042
```

---

## Deployment map

| Component | Host | URL / endpoint |
|---|---|---|
| Web | Vercel | `https://<project>.vercel.app` |
| .NET backend | Railway | `https://copilot-backend-production.up.railway.app` (example) |
| Gateway Orthanc HTTP | Railway (HTTP proxy) | `https://copilot-hackethon-production.up.railway.app` |
| Gateway Orthanc DIMSE | Railway (TCP proxy) | `monorail.proxy.rlwy.net:28724` (example — allocated per-project) |
| Vendor Sim Orthanc | Railway | `https://copilot-vendor-sim-production.up.railway.app` |
| Desktop app binaries | Staged at `web/public/release/` by `electron/scripts/build.sh`, served from the web deploy |

**Railway TCP proxy setup:** For the Gateway's DIMSE port, add a TCP proxy in Settings → Networking → TCP Proxy → target port `4242`. Railway allocates a hostname like `monorail.proxy.rlwy.net:<randomport>`. Put that into `orthanc-vendor-sim/orthanc.json` under `DicomModalities`.

---

## Local development

### Minimum setup (web + backend, no PACS)

```bash
# Web
cd web && npm install && npm run dev       # http://localhost:5173

# Backend (for Server mode)
cd backend/CopilotDicom.Api && dotnet run  # http://localhost:5050
```

### Full stack (adds Electron + Orthanc)

```bash
# Gateway Orthanc
cd orthanc && docker build -t copilot-orthanc . && \
  docker run --rm -d --name copilot-orthanc -p 8042:8042 -p 4242:4242 copilot-orthanc

# Vendor Sim Orthanc (point its Lua to localhost gateway)
# Edit orthanc-vendor-sim/orthanc.json → DicomModalities.copilot-gateway-dimse
# to use host.docker.internal:4242 locally
cd orthanc-vendor-sim && docker build -t vendor-sim . && \
  docker run --rm -d --name vendor-sim -p 8043:8042 vendor-sim

# Electron (loads web/dist — web must be built first for production mode,
# or use dev mode which points at web's vite dev server)
cd electron && npm install && npm run dev
```

Electron in dev mode loads `web/src/` live-reload from Vite — no rebuild needed for UI changes. Changes to `electron/src/` (main/preload) require `npm run dev` restart.

---

## Testing

```bash
cd web && npm test                        # vitest + RTL
cd electron && npm test                   # vitest (IPC + Orthanc client tests)
dotnet test backend/CopilotDicom.sln     # .NET unit tests
```

---

## Desktop app builds

```bash
# All-in-one (runs the full 6-step pipeline — web, renderer copy, esbuild,
# Mac .dmg, Windows .exe, and stages both into web/public/release/)
cd electron && ./scripts/build.sh

# Or via npm
cd electron && npm run pack:all    # same builds, but does NOT stage to web/public/release/
cd electron && npm run pack:mac    # Mac .dmg only
cd electron && npm run pack:win    # Windows .exe only
```

**Cross-platform caveats:**
- Mac `.dmg` only builds cleanly on macOS.
- Windows `.exe` cross-built from macOS uses electron-builder's wine fallback — flaky. For shippable Windows builds, run `pack:win` on Windows or in CI.

Build output:
- `electron/release/` — raw electron-builder output
- `web/public/release/CopilotDICOMViewer-mac.dmg` — staged for download from the web deploy
- `web/public/release/CopilotDICOMViewer-win.exe` — ditto

---

## "Where do I change X?" cheat sheet

| If you want to... | Edit this |
|---|---|
| Change the backend URL used by the web app | `web/.env` → `VITE_SERVER_URL` |
| Change the Gateway Orthanc used by Electron | `electron/.env` → `ORTHANC_URL` |
| Change how often Electron polls the Gateway | `electron/src/orthanc/poller.ts` (poll interval) |
| Add/rename a protocol tag | BOTH `orthanc-vendor-sim/autoforward.lua` AND `web/src/pages/PacsPage/hooks/usePacsStudyList.ts` (constants must match) |
| Add a new PACS protocol mode | `web/src/types/mode.types.ts` (add RenderMode), `sidebar-items.tsx` (add sidebar entry), `usePacsStudyList.ts` (add filter), any push-side changes to Lua script |
| Change what metadata rows appear in the sidebar | `web/src/components/MetadataPanel/metadata-rows.ts` |
| Add a new DICOM tag to the metadata panel | `web/src/types/dicom.types.ts` (type), `web/src/lib/utility/metadata.ts` (extraction), `metadata-rows.ts` (display), `electron/src/orthanc/client.ts` (add to `includefield` if QIDO needs to return it), `web/src/service/pacs-ipc.service.ts` (if mapping from QIDO study) |
| Change how Server mode converts DICOM | `backend/CopilotDicom.Api/Services/DicomService.cs` |
| Change the About page content | `web/src/pages/AboutPage/AboutPage.tsx` |
| Change which sidebar items show in browser vs Electron | `web/src/components/Sidebar/sidebar-items.tsx` (checks `window.pacs`) |
| Change the DIMSE AE Title | `orthanc-vendor-sim/orthanc.json` → `DicomModalities.copilot-gateway-dimse[0]` |
| Change the Gateway's accepted AE Title | `orthanc/orthanc.json` → set `DicomCheckCalledAet: true` + add allowed titles |
| Add a new destination for the vendor sim | `orthanc-vendor-sim/orthanc.json` → `DicomModalities` or `OrthancPeers`, then push in `autoforward.lua` |
| Change desktop app icon / name | `electron/package.json` → `build.productName`, `electron/icons/` |

---

## Known caveats

- **Railway TCP proxy hostnames change per project.** If you redeploy the Gateway from scratch, the TCP proxy endpoint updates — you must update `orthanc-vendor-sim/orthanc.json` accordingly.
- **Railway `PORT` env var conflicts with DicomPort.** Do NOT set `PORT=4242`. Orthanc's TCP listener (`DicomPort`) reads from `orthanc.json`, and Railway's HTTP proxy reads from `PORT`. Keep them separate: `PORT=8042` for HTTP, `DicomPort: 4242` for TCP.
- **Server mode loses DICOM metadata.** PNG conversion discards everything except pixel data. See the "Points to ponder" section in the About page — we'll likely want a hybrid (original DICOM + preview PNG) in production.
- **Electron Windows build from macOS is flaky** — use CI or a Windows machine for shippable `.exe`.
- **Orthanc admin UI auth is disabled** in both instances (`AuthenticationEnabled: false`) — hackathon only. Production must enable auth and set `RegisteredUsers`.
- **In-memory study cache in .NET backend** — restart flushes. Fine for the POC; production needs a real store.
- **Lua `OnStableStudy` recursion guard is by tag match.** If you change the tag strings in `autoforward.lua`, the guard still checks for the old strings until you update both the writes and the check.
- **Desktop app only fetches studies lazily.** The list updates every 2s, but a study's pixel data is only fetched on click.

---

## Further reading

- Component READMEs: [web/README.md](web/README.md), [backend/README.md](backend/README.md), [electron/README.md](electron/README.md), [orthanc/README.md](orthanc/README.md), [orthanc-vendor-sim/README.md](orthanc-vendor-sim/README.md)
- Design spec: [docs/superpowers/specs/2026-04-13-dicom-viewer-design.md](docs/superpowers/specs/2026-04-13-dicom-viewer-design.md)
- Phase plans: [docs/superpowers/plans/](docs/superpowers/plans/)

## Sample data

- `samples/dental-pano.dcm` — dental panoramic X-ray (single frame, uncompressed, modality PX)
- `samples/mri-knee/series-000001/` — 24-slice MRI series (JPEG Lossless, modality MR)

Both are public fixtures from `dicomlibrary-100`; safe to commit. No real patient data.
