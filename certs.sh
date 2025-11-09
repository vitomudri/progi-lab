#!/bin/bash

WORKDIR=$(dirname -- "$(readlink -f -- "$0")")

set -a
source "$WORKDIR/.env"
set +a


source $CERTBOT_PATH/bin/activate

certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials $HOME/.secrets/certbot/cloudflare.ini \
    --renew-with-new-domains \
    --agree-tos \
    --dns-cloudflare-propagation-seconds 60 \
    --config-dir "$WORKDIR/certs/certbot/config" \
    --work-dir "$WORKDIR/certs/certbot/work" \
    --logs-dir "$WORKDIR/certs/certbot/work" \
    -d 'kuhari.app' \
    -d 'www.kuhari.app' \
    -d 's3.kuhari.app' \
    -d '*.s3.kuhari.app'
