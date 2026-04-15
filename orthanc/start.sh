#!/bin/bash
# Orthanc listens on the ports defined in orthanc.json:
#   HttpPort = 8042 (DICOMweb + admin UI — Railway HTTP proxy forwards here)
#   DicomPort = 4242 (DIMSE C-STORE — Railway TCP proxy forwards here)
#
# Railway must be configured with PORT=8042 in the service's env vars
# so Railway's HTTP proxy targets the same port Orthanc listens on.

echo "[start.sh] Starting Orthanc with HttpPort=8042 + DicomPort=4242"
exec Orthanc /etc/orthanc/orthanc.json
