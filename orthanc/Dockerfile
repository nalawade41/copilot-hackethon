FROM jodogne/orthanc-plugins:latest

# Copy config + startup script
COPY orthanc.json /etc/orthanc/orthanc.json
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose both ports:
#   8042 = HTTP default (may be overridden by PORT env var on Railway)
#   4242 = TCP (DIMSE C-STORE receiver)
EXPOSE 8042 4242

# Use our startup script which adapts HttpPort to Railway's PORT env var
CMD ["/start.sh"]
