# orthanc

Cloud-hosted Orthanc PACS server that serves **two roles simultaneously**:

## Dual role

### Role 1: Simulated vendor PACS (for HTTP poll / DICOMweb clients)

Acts as the imaging system that modern Copilot clients poll via DICOMweb. Users upload DICOM files through the admin web UI (simulating "tech takes an X-ray"), and Copilot discovers them automatically via QIDO-RS polling.

```
[User uploads via web UI]                    [Copilot Electron/Web]
         │                                          │
         ▼                                          │
   ┌──────────┐                                     │
   │ Orthanc  │  ◀── GET /dicom-web/studies ────────┘
   │ HTTP:8042│      (polls every 2 seconds)
   └──────────┘
```

**Used by:** offices with modern DICOMweb-capable systems, and for all hackathon demos.

### Role 2: DIMSE receiver (for TCP push / legacy vendor systems)

Acts as a receiving endpoint where legacy imaging software pushes X-rays via the classic DICOM protocol (DIMSE C-STORE over TCP). Once received, the same DICOMweb poll picks them up — Copilot doesn't know or care how the image arrived.

```
[Vendor imaging SW]                          [Copilot Backend]
         │                                          │
         │ C-STORE (TCP:4242)                       │
         ▼                                          │
   ┌──────────┐                                     │
   │ Orthanc  │  ◀── GET /dicom-web/studies ────────┘
   │ TCP:4242 │      (polls every 2 seconds)
   │ HTTP:8042│
   └──────────┘
```

**Used by:** offices with legacy DIMSE-only systems (DEXIS, older Carestream, etc.)

### Both roles, one server

```
┌─────────────────────────────────────────────────────────┐
│                     Cloud Orthanc                        │
│                                                          │
│   Port 8042 (HTTP)              Port 4242 (TCP)          │
│   ├── DICOMweb API              ├── DIMSE C-STORE        │
│   │   (QIDO-RS, WADO-RS)       │   receiver             │
│   ├── Admin web UI              ├── DIMSE C-ECHO         │
│   │   (manual upload)           │   (connectivity test)  │
│   └── Health check (/system)    └── Accepts any AE Title │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │            Shared DICOM storage                  │   │
│   │   Studies from BOTH sources land in the same     │   │
│   │   store and are served via the same DICOMweb API │   │
│   └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

Images arrive via **either** path and are served via **the same** DICOMweb endpoint. Copilot's polling code doesn't change regardless of how the image got into Orthanc.

## Deploy to Railway

1. Go to [railway.app](https://railway.app) → sign in with GitHub
2. New Project → Deploy from GitHub repo
3. Select this repo, set root directory to `orthanc`
4. Railway auto-detects the Dockerfile and `railway.toml`
5. After deploy, go to **Settings → Networking**:
   - Port **8042** should be auto-detected (HTTP — health check + DICOMweb + admin UI)
   - Add port **4242** as **TCP** (DIMSE push receiver)
6. You'll get:
   - HTTP: `https://orthanc-xxxxx.up.railway.app` (DICOMweb API + admin UI)
   - TCP: `orthanc-xxxxx.up.railway.app:4242` (DIMSE push target)

**Both ports must be exposed** for the dual role to work.

## Configure Copilot to poll from it

### Electron app (`electron/.env`):
```
ORTHANC_URL=https://orthanc-xxxxx.up.railway.app
ORTHANC_USER=
ORTHANC_PASSWORD=
```

Copilot polls `GET /dicom-web/studies` every 2 seconds. It picks up images regardless of whether they arrived via the admin UI upload, curl, or DIMSE push.

## Configure vendor software to push to it (DIMSE)

### Vendor imaging software settings:
```
Host:      orthanc-xxxxx.up.railway.app
Port:      4242
AE Title:  COPILOT    (or per-office: COPILOT_123)
```

### Test DIMSE push locally:
```bash
brew install dcmtk
storescu orthanc-xxxxx.up.railway.app 4242 samples/dental-pano.dcm
```

### Test connectivity (C-ECHO):
```bash
echoscu orthanc-xxxxx.up.railway.app 4242
```

## Upload manually (simulating Role 1)

Via the admin web UI:
1. Open `https://orthanc-xxxxx.up.railway.app` in a browser
2. Click Upload → drag a `.dcm` file in

Via curl:
```bash
curl -X POST https://orthanc-xxxxx.up.railway.app/instances \
  --data-binary @samples/dental-pano.dcm
```

## Delete a study (after backend processes it)

```bash
# List all studies
curl https://orthanc-xxxxx.up.railway.app/studies

# Delete a specific study
curl -X DELETE https://orthanc-xxxxx.up.railway.app/studies/{orthanc-id}
```

In production, the backend would automatically delete studies after downloading and storing them in S3/DB — keeping Orthanc as a temporary inbox, not permanent storage.

## Run locally

```bash
docker build -t copilot-orthanc .
docker run --rm -d --name copilot-orthanc -p 8042:8042 -p 4242:4242 copilot-orthanc
```

Both roles work locally too:
- Admin UI: `http://localhost:8042`
- DICOMweb: `http://localhost:8042/dicom-web/studies`
- DIMSE push: `storescu localhost 4242 your-file.dcm`

## Config reference (`orthanc.json`)

| Setting | Value | Role it serves | Purpose |
|---|---|---|---|
| `HttpPort` | `8042` | Role 1 + 2 | DICOMweb API, admin UI, health check |
| `DicomPort` | `4242` | Role 2 | DIMSE C-STORE listener |
| `DicomAlwaysAllowEcho` | `true` | Role 2 | Accept C-ECHO connectivity tests from any vendor |
| `DicomAlwaysAllowStore` | `true` | Role 2 | Accept C-STORE image pushes from any vendor |
| `DicomCheckCalledAet` | `false` | Role 2 | Don't reject based on AE Title (hackathon). Production: `true` + configure allowed titles |
| `RemoteAccessAllowed` | `true` | Role 1 + 2 | Required for cloud hosting |
| `AuthenticationEnabled` | `false` | Role 1 | Hackathon only. Production: enable + set users |
| `StableAge` | `5` | Role 1 + 2 | Study marked complete after 5s of no new instances arriving |
| `OverwriteInstances` | `true` | Role 2 | Re-push replaces instead of duplicating |

## Production hardening checklist

- [ ] Enable `AuthenticationEnabled` + set `RegisteredUsers` (HTTP auth for admin UI + DICOMweb)
- [ ] Enable DICOM TLS for port 4242 (`DicomTlsEnabled` + certificate paths) — encrypts DIMSE traffic
- [ ] Set `DicomCheckCalledAet: true` + configure allowed AE Titles per office
- [ ] Mount persistent storage volume for `/var/lib/orthanc/db`
- [ ] Add health monitoring (ping `/system` every 30s, alert on failure)
- [ ] Set up log forwarding
- [ ] Configure backup for the storage volume
- [ ] Add backend auto-delete after processing (keep Orthanc as inbox, not archive)
