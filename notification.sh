#!/bin/bash
set -euo pipefail

WORKDIR=$(dirname -- "$(readlink -f -- "$0")")

set -a
source "$WORKDIR/.env"
set +a


URL="$DISCORD_WEBHOOK_URL"
USERNAME="${DISCORD_USERNAME:-Kuhari VPS}"
TITLE="${DISCORD_TITLE:-Server Notification}"
DESCRIPTION="${DISCORD_DESCRIPTION:-Something happened but a message was not provided}"
COLOR="${DISCORD_COLOR:-0}"

JSON=$(jq -n \
  --arg username "$USERNAME" \
  --arg title "$TITLE" \
  --arg description "$DESCRIPTION" \
  --argjson color "$COLOR" \
  --arg timestamp "$(date --utc --iso-8601=seconds)" \
  '{
    username: $username,
    embeds: [{
      title: $title,
      description: $description,
      color: $color,
      timestamp: $timestamp
    }]
  }'
)

curl -s -H "Content-Type: application/json" \
     -X POST \
     -d "$JSON" \
     "$URL" > /dev/null
