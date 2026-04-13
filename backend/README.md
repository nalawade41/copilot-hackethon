# CopilotDicom.Api

ASP.NET Core 8 Minimal API — parses DICOM via `fo-dicom` and serves rendered PNG frames to the Copilot web app (`../web/`).

## Endpoints

| Method | Path | Response |
|---|---|---|
| `POST` | `/api/dicom/upload` | `UploadResponse` JSON (studyId, frameCount, frameUrls[], metadata) |
| `GET`  | `/api/dicom/{studyId}/frame/{index}` | `image/png` bytes, or 404 |
| `GET`  | `/api/health` | `{"status":"ok"}` |

Upload takes `multipart/form-data` with field `file`.

## Run

```bash
dotnet run --urls http://localhost:5050
```

CORS is wide-open (`AllowAnyOrigin`) — hackathon only.
Study cache is in-memory — cleared on restart.

> **Why port 5050 and not 5000?** macOS's AirPlay Receiver silently binds to port 5000 and intercepts requests with a `403 Forbidden` from `AirTunes`. Either use a different port (we pick 5050) or disable AirPlay Receiver in System Settings → General → AirDrop & Handoff.

## Test

```bash
dotnet test ../CopilotDicom.sln
```

## Architecture

- `Program.cs` — minimal API pipeline, DI, CORS
- `Services/DicomService.cs` — wraps `fo-dicom`: parse, render each frame to PNG via ImageSharp, cache in `ConcurrentDictionary<Guid, Study>`
- `Models/` — `Study`, `StudyMetadata`, `UploadResponse` records

## Deploy (future)

Not in scope for the hackathon. AWS Lambda via `Amazon.Lambda.AspNetCoreServer` is the planned path.
