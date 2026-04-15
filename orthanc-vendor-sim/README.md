# orthanc-vendor-sim

Simulates a dental clinic's imaging software (DEXIS, Carestream, Planmeca, etc.) for the hackathon demo. This is a second Orthanc instance that auto-forwards every uploaded study to the main Copilot DICOM gateway via DIMSE C-STORE.

## How it works

```
[Stakeholder]                   [This server]                    [Copilot Gateway]
                                Vendor Simulator                 (Railway Orthanc)
      │                              │                                │
      │  Uploads .dcm via web UI     │                                │
      └─────────────────────────────▶│                                │
                                     │                                │
                                     │ Auto-forwards via              │
                                     │ DIMSE C-STORE (TCP:4242)       │
                                     │ using Lua auto-forward script  │
                                     └───────────────────────────────▶│
                                                                      │
                                                          Copilot polls and
                                                          displays the image
```

User uploads → this server auto-pushes via real DIMSE protocol → Copilot picks it up. The stakeholder sees the full flow without installing anything.

## Deploy to Render

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Root directory: `orthanc-vendor-sim`
4. Runtime: Docker
5. Plan: Free
6. Deploy

You'll get a URL like: `https://vendor-sim-xxxx.onrender.com`

Open that URL → Orthanc admin UI → Upload → drag a `.dcm` file → it auto-forwards to the Railway Orthanc → Copilot shows it.

## Config

### `orthanc.json` — key settings

```json
"DicomModalities": {
  "copilot-gateway": ["COPILOT", "copilot-hackethon-production.up.railway.app", 4242]
}
```

This registers the Railway Orthanc as a DIMSE push destination. The Lua script (`autoforward.lua`) triggers a push every time a study becomes stable (all instances received, 3-second quiet period).

### Auto-forward flow

1. User uploads via web UI (HTTP POST to this server)
2. Orthanc stores the study locally
3. After 3 seconds of no new instances (`StableAge: 3`), study is "stable"
4. Lua script fires `OnStableStudy` → calls `SendToModality(studyId, 'copilot-gateway')`
5. Orthanc pushes the study via DIMSE C-STORE to Railway's port 4242
6. Done — Copilot's poller finds it on the next tick

## Run locally

```bash
docker build -t vendor-sim .
docker run --rm -d --name vendor-sim -p 8043:8042 vendor-sim
```

Open `http://localhost:8043` → upload a file → it pushes to Railway Orthanc via DIMSE.

## Render free tier note

Render free services sleep after 15 min idle. First request takes ~30s to wake. Hit the URL a minute before the demo.
