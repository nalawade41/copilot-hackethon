# Copilot DICOM Viewer — Demo Guide

A step-by-step walkthrough of every menu option in the app and what each piece represents in a real dental clinic.

---

## What the two Orthanc servers represent

| Demo server | Real-world equivalent | URL in demo |
|---|---|---|
| **Gateway Orthanc** | Copilot's cloud receiver — where images land before the viewer picks them up | `copilot-hackethon-production.up.railway.app` |
| **Vendor Sim Orthanc** | The clinic's imaging software (DEXIS, Carestream, Planmeca, Sidexis, etc.) sitting next to the X-ray machine | `copilot-vendor-sim-production.up.railway.app` |

In production, the Gateway stays ours (hosted on AWS/Azure). The Vendor Sim gets replaced by the clinic's actual imaging software — no code changes needed.

---

## Menu options — step by step

### 1. How it works

**What it is:** Overview page explaining the architecture, protocols, and servers.

**Steps:**
1. Open the app (web or desktop)
2. Click "How it works" in the sidebar
3. Scroll through the sections — servers, protocols, coverage percentages, clinic setup requirements

**No interaction needed — read-only page.**

---

### 2. Browser only

**What it is:** DICOM files parsed and rendered entirely in the browser. No server involved.

**Real-world use:** Quick preview of a DICOM file without sending it anywhere. Good for privacy-sensitive files or offline use.

**Steps — single file:**
1. Click "Browser only" in sidebar
2. Click "Upload file" in the toolbar
3. Select a `.dcm` file (e.g., `samples/dental-pano.dcm`)
4. Image renders immediately with metadata panel on the right
5. Use mouse wheel to zoom, drag to pan, Ctrl+drag for brightness/contrast

**Steps — folder (multi-slice):**
1. Click the close/reset button in the toolbar
2. Click "Upload folder"
3. Select a folder of `.dcm` files (e.g., `samples/mri-knee/series-000001/`)
4. Confirm the browser's folder access prompt
5. First slice renders, slider appears at the bottom
6. Drag the slider to scroll through slices

---

### 3. Server based

**What it is:** DICOM file is uploaded to a .NET backend which converts it to PNG and returns the rendered image.

**Real-world use:** Demonstrates where server-side AI analysis, measurements, or report generation would plug in. The backend already has the parsed DICOM data — adding AI is an extension, not a new architecture.

**Steps:**
1. Click "Server based" in sidebar
2. (Optional) Open browser DevTools → Network tab to see the calls
3. Click "Upload file", select a `.dcm` file
4. Watch two network calls:
   - `POST /api/dicom/upload` — sends the DICOM to the backend
   - `GET /api/dicom/{id}/frame/0` — fetches back the rendered PNG
5. Image renders. Note the smaller response size (PNG ~100-500 KB vs DICOM ~8 MB)

**Key difference from Browser only:** the image is a PNG — no brightness/contrast control. Metadata is extracted server-side and returned in the JSON response.

---

### 4. Desktop App (browser only)

**What it is:** Download page for the native Electron app (macOS + Windows). Only visible when running in the browser — the desktop app itself doesn't show this page.

**Steps:**
1. Click "Desktop App" in sidebar
2. Choose your platform:
   - **macOS Apple Silicon** — M1/M2/M3/M4 Macs (2020+)
   - **macOS Intel** — older Macs (pre-2020)
   - **Windows** — 64-bit
3. Download and install

**macOS extra step (one-time):**
1. Install the app to Applications (drag from DMG)
2. **Do NOT open it yet**
3. Copy the unlock command from the red banner on the download page
4. Open Terminal (⌘+Space → type "Terminal" → Enter)
5. Paste the command (⌘+V), press Enter
6. Close Terminal
7. Now open the app normally (⌘+Space → "Copilot DICOM" → Enter)

**Windows extra step:** On first launch, click "More info" → "Run anyway" on the SmartScreen prompt.

---

### 5. DICOMweb Poll (desktop app only)

**What it is:** Copilot polls the clinic's imaging system every 2 seconds asking "any new X-rays?" and automatically displays new ones.

**Protocol:** DICOMweb (QIDO-RS for querying, WADO-RS for fetching). HTTP-based, introduced ~2015. ~50-60% vendor coverage.

**Real-world equivalent:** Copilot connects to the clinic's PACS server URL. Clinic changes nothing — just shares the URL.

**What the Gateway Orthanc represents:** The clinic's PACS server (DEXIS, Carestream, etc.). In production, we'd swap this URL with the clinic's real server.

**Steps:**
1. Open the desktop app
2. Click "DICOMweb (Poll)" in sidebar
3. Note the Gateway URL at the bottom of the page
4. Click the URL — an in-app popup opens showing the Orthanc admin UI
5. Click "Upload" in the Orthanc admin UI
6. Select a `.dcm` file and upload it
7. Close the popup
8. Within ~2 seconds, the study appears in the sidebar list
9. Click the study to view the image
10. Description in metadata shows "[DICOMweb (Poll)]"

---

### 6. DIMSE C-STORE (desktop app only)

**What it is:** The clinic's imaging system pushes images to Copilot over the classic TCP protocol the moment an X-ray is captured.

**Protocol:** DIMSE C-STORE. TCP-based, since 1993. ~100% vendor coverage (every DICOM device ever made).

**Real-world equivalent:** Clinic IT adds Copilot as a DICOM destination — 3 fields (hostname, port, AE Title), 2 minutes, done once.

**What the Vendor Sim Orthanc represents:** The clinic's imaging software (DEXIS, Carestream, etc.). When a file is uploaded, a Lua script auto-pushes it to Copilot's Gateway via DIMSE C-STORE (TCP).

**Steps:**
1. Click "DIMSE C-STORE" in sidebar
2. Note the Vendor Sim URL at the bottom
3. Click the URL — popup opens showing the Vendor Sim admin UI
4. Click "Upload", select a `.dcm` file, upload it
5. Close the popup
6. Wait ~5 seconds (3s stable age + push time)
7. Study appears in the sidebar tagged "[DIMSE C-STORE (TCP)]"
8. Click to view — same viewer, image arrived via classic TCP push

---

### 7. STOW-RS (desktop app only)

**What it is:** Same push concept as DIMSE but over modern HTTPS instead of raw TCP.

**Protocol:** STOW-RS (Store Over the Web). HTTP-based, since ~2015. ~50-60% vendor coverage.

**Real-world equivalent:** Clinic IT adds Copilot's HTTPS URL as a STOW endpoint — one field, done once.

**What the Vendor Sim does here:** The same upload from step 6 above also pushes a copy via STOW-RS simultaneously. Both protocols fire from a single upload.

**Steps:**
1. Click "STOW-RS" in sidebar
2. If you already uploaded via the DIMSE step above, the study is **already here** — tagged "[STOW-RS (HTTP)]"
3. If not, click the Vendor Sim URL → upload a file → close → study appears in ~5 seconds
4. Click to view — same image, arrived via HTTPS push

**Key demo point:** One upload to the Vendor Sim → two deliveries (DIMSE + STOW-RS) → each appears in its own tab. Proves both protocols work end-to-end.

---

## Quick reference — what shows where

| I uploaded to... | Shows in DICOMweb Poll tab | Shows in DIMSE tab | Shows in STOW-RS tab |
|---|---|---|---|
| Gateway Orthanc (directly) | Yes | No | No |
| Vendor Sim Orthanc | No | Yes (tagged) | Yes (tagged) |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| macOS says app is "damaged" | Run the `xattr -cr` command from the download page |
| Desktop app shows no studies | Check that the Gateway Orthanc is online: open its URL in a browser |
| Upload to Vendor Sim doesn't appear | Wait ~5 seconds. Check Vendor Sim is online. Check Railway deployment logs for Lua script errors |
| Studies from old tests still showing | Delete them via the Gateway Orthanc admin UI (click study → Delete) |
| PACS tabs not visible in browser | PACS modes are desktop-only. Download the Electron app |
