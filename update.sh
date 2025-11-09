#!/bin/bash

WORKDIR=$(dirname -- "$(readlink -f -- "$0")")

pushd "$WORKDIR/docker" &>/dev/null

docker compose pull

if [[ $? -ne 0 ]]; then
    export DISCORD_TITLE="Update failed!"
    export DISCORD_DESCRIPTION="The update script has failed on stage: pull image"
    "$WORKDIR/notification.sh"
    exit 1
fi

docker compose up -d

if [[ $? -ne 0 ]]; then
    export DISCORD_TITLE="Update failed!"
    export DISCORD_DESCRIPTION="The update script has failed on stage: recreate containers"
    "$WORKDIR/notification.sh"
    exit 1
fi

popd &>/dev/null

export DISCORD_TITLE="Update completed."
export DISCORD_DESCRIPTION="The update script was run and completed successfully."
"$WORKDIR/notification.sh"
