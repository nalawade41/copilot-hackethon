FROM jodogne/orthanc-plugins:latest

# Copy our custom config
COPY orthanc.json /etc/orthanc/orthanc.json

# Railway uses PORT env var for HTTP health checks.
# Orthanc's HTTP port is 8042 — Railway needs to know this.
ENV PORT=8042

# Expose both ports:
#   8042 = HTTP (DICOMweb API + admin UI + Railway health check)
#   4242 = TCP  (DIMSE C-STORE receiver for vendor push)
EXPOSE 8042 4242
