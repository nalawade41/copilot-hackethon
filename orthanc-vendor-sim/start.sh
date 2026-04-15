#!/bin/bash
# Adapt Orthanc's HTTP port to Railway/Render's PORT env var
HTTP_PORT="${PORT:-8042}"

echo "[start.sh] Vendor Simulator — HTTP port: ${HTTP_PORT}"
sed -i "s/\"HttpPort\": [0-9]*/\"HttpPort\": ${HTTP_PORT}/" /etc/orthanc/orthanc.json

echo "[start.sh] Starting Orthanc (vendor simulator)..."
exec Orthanc /etc/orthanc/orthanc.json
