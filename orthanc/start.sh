#!/bin/bash
# Railway sets PORT env var (default 8080). Orthanc needs to listen on it
# so Railway's health check and proxy can reach it.
# This script patches orthanc.json at startup with the actual PORT value.

HTTP_PORT="${PORT:-8042}"

echo "[start.sh] Configuring Orthanc HTTP port to ${HTTP_PORT} (from PORT env var)"

# Replace HttpPort in orthanc.json with the actual PORT
sed -i "s/\"HttpPort\": [0-9]*/\"HttpPort\": ${HTTP_PORT}/" /etc/orthanc/orthanc.json

echo "[start.sh] Starting Orthanc..."
exec Orthanc /etc/orthanc/orthanc.json
