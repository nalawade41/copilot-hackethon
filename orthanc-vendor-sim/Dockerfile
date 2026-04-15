FROM jodogne/orthanc-plugins:latest

# Copy all files in one COPY to avoid stale-cache issues with individual files
COPY orthanc.json /etc/orthanc/orthanc.json
COPY autoforward.lua /etc/orthanc/autoforward.lua
COPY start.sh /start.sh

RUN chmod +x /start.sh

EXPOSE 8042

ENTRYPOINT []
CMD ["/start.sh"]

# Build cache buster: 2026-04-15-v2
