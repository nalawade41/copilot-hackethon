FROM jodogne/orthanc-plugins:latest

COPY orthanc.json /etc/orthanc/orthanc.json
COPY autoforward.lua /etc/orthanc/autoforward.lua
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8042

ENTRYPOINT []
CMD ["/start.sh"]
