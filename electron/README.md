# electron

Electron wrapper for Copilot DICOM viewer. Loads `web/src/` as its renderer and adds a PACS mode via IPC to Orthanc.

## Run (dev)

```bash
cd electron
npm install
npm run dev
```

Opens a native window. Sidebar shows Browser / Server / PACS items.

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
