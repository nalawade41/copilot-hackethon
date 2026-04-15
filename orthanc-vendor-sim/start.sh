#!/bin/bash
# Vendor sim only needs HTTP (admin UI for uploads + Lua auto-forward outbound).
# No inbound DIMSE on this service — pushes go OUT to the gateway.
#
# Railway must be configured with PORT=8042 to match orthanc.json HttpPort.

echo "[start.sh] Starting Orthanc vendor sim with HttpPort=8042"
exec Orthanc /etc/orthanc/orthanc.json
