#!/bin/bash

WORKDIR=$(dirname -- "$(readlink -f -- "$0")")

pushd "$WORKDIR/docker" &>/dev/null

docker compose pull
docker compose up -d

popd &>/dev/null
