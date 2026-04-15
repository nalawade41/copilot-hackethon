FROM jodogne/orthanc-plugins:latest

# Copy config + startup script
COPY orthanc.json /etc/orthanc/orthanc.json
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8042 4242

# Override the base image's ENTRYPOINT (which is Orthanc binary)
# so our startup script runs instead
ENTRYPOINT []
CMD ["/start.sh"]
