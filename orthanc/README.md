# orthanc

Orthanc PACS server for the hackathon demo. Deployed as a Docker container on Render.

## What this is

A free, open-source DICOM server that simulates the imaging software a real dental clinic would use (DEXIS, Carestream, Planmeca, etc.). Copilot's Electron app connects to it via DICOMweb — the same protocol real vendor software uses.

## Deploy to Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root directory:** `orthanc`
   - **Runtime:** Docker
   - **Plan:** Free
4. Click "Create Web Service"

Render builds the Dockerfile and deploys. You'll get a URL like:
```
https://copilot-orthanc.onrender.com
```

The DICOMweb endpoint is at:
```
https://copilot-orthanc.onrender.com/dicom-web/studies
```

## Configure the Electron app to use it

Update `electron/.env`:
```
ORTHANC_URL=https://copilot-orthanc.onrender.com
ORTHANC_USER=
ORTHANC_PASSWORD=
```

Auth is disabled in the hackathon config (see `orthanc.json`).

## Upload a study (simulate "tech takes an X-ray")

Via curl:
```bash
curl -X POST https://copilot-orthanc.onrender.com/instances \
  --data-binary @samples/dental-pano.dcm
```

Or open `https://copilot-orthanc.onrender.com` in a browser → click Upload → drag a `.dcm` file in.

## Run locally (alternative to cloud)

```bash
docker build -t copilot-orthanc .
docker run --rm -d --name copilot-orthanc -p 8042:8042 -p 4242:4242 copilot-orthanc
```

Then use `ORTHANC_URL=http://localhost:8042`.

## Config

`orthanc.json` is the Orthanc configuration:
- **Auth disabled** — hackathon only. In production, enable `AuthenticationEnabled` and set `RegisteredUsers`.
- **DICOMweb enabled** — QIDO-RS, WADO-RS, STOW-RS all active.
- **Remote access allowed** — required for Render (external HTTP traffic).

## Free tier note

Render's free Docker service sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake. For a live demo, hit the health endpoint a minute before:
```bash
curl https://copilot-orthanc.onrender.com/system
```
