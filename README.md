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

## Quick start

```bash
# Web (client-side DICOM rendering + backend mode toggle)
cd web && npm install && npm run dev      # http://localhost:5173

# Backend (.NET — required only for Server mode in the web UI)
cd backend/CopilotDicom.Api && dotnet run # http://localhost:5050
```

## Testing

```bash
# Frontend
cd web && npm test

# Backend
dotnet test backend/CopilotDicom.sln
```

## Documentation

- Design spec: [docs/superpowers/specs/2026-04-13-dicom-viewer-design.md](docs/superpowers/specs/2026-04-13-dicom-viewer-design.md)
- Phase plans: [docs/superpowers/plans/](docs/superpowers/plans/)

## Sample data

`samples/dental-pano.dcm` — dental panoramic X-ray (single frame, uncompressed, modality PX).
`samples/mri-knee/series-000001/` — 24-slice MRI series (JPEG Lossless, modality MR).

Both are public fixtures from `dicomlibrary-100`; safe to commit.
