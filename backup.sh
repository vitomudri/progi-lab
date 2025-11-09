#!/bin/bash

WORKDIR=$(dirname -- "$(readlink -f -- "$0")")

set -a
source "$WORKDIR/.env"
set +a


PGHOST="$BAK_PG_HOST"
PGPORT="$BAK_PG_PORT"
PGUSER="$BAK_PG_USER"
PGDATABASE="$BAK_PG_DATABASE"

BORG_REPO="$WORKDIR/backup"
export BORG_PASSPHRASE="$BAK_BORG_PASS"

# RCLONE_REMOTE="${BAK_RCLONE_REMOTE:-remote:path}"


BACKUP_NAME="pg_backup_$(date --utc --iso-8601=minutes)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -f "$TMP_DIR/$PGDATABASE.dump" "$PGDATABASE"

if [[ $? -ne 0 ]]; then
    export DISCORD_TITLE="Backup failed!"
    export DISCORD_DESCRIPTION="The backup script has failed on stage: create database dump"
    "$WORKDIR/notification.sh"
    exit 1
fi

borg create "$BORG_REPO::$BACKUP_NAME" "$TMP_DIR"

if [[ $? -ne 0 ]]; then
    export DISCORD_TITLE="Backup failed!"
    export DISCORD_DESCRIPTION="The backup script has failed on stage: create borg backup"
    "$WORKDIR/notification.sh"
    exit 1
fi

borg prune -v --list --keep-daily=7 --keep-weekly=4 --keep-monthly=6 "$BORG_REPO"

if [[ $? -ne 0 ]]; then
    export DISCORD_TITLE="Backup failed!"
    export DISCORD_DESCRIPTION="The backup script has failed on stage: prune borg backup"
    "$WORKDIR/notification.sh"
    exit 1
fi

# rclone copy "$BORG_REPO" "$RCLONE_REMOTE"

# if [[ $? -ne 0 ]]; then
#     export DISCORD_TITLE="Backup failed!"
#     export DISCORD_DESCRIPTION="The backup script has failed on stage: rclone backup to remote"
#     "$WORKDIR/notification.sh"
#     exit 1
# fi
