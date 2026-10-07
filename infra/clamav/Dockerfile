# Pin the engine patch; review upstream security releases before updating it.
FROM clamav/clamav:1.5.4

COPY clamd.conf /etc/clamav/clamd.conf

# Keep official signatures current without downloading the full database every restart.
ENV FRESHCLAM_CHECKS=12

EXPOSE 3310
