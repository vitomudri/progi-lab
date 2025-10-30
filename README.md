# Deployment

TODO: Write a description

# Environment setup

`./.env` should define:

- POSTGRES_DB - The default postgres database for the postgres container
- POSTGRES_USER - The default postgres user for the postgres container
- POSTGRES_PASSWORD - The default postgres user's password for the postgres container
- GARAGE_RPC_SECRET - The garage RPC secret/token
- GARAGE_ADMIN_TOKEN - The garage admin panel token
- GARAGE_METRICS_TOKEN - The garage prometheus metrics access token

- BAK_PG_HOST - backup.sh - The postgres server address
- BAK_PG_PORT - backup.sh - The postgres server port
- BAK_PG_USER - backup.sh - The postgres db user to use
- BAK_PG_DATBASE - backup.sh - The postgres db to use
- BAK_BORG_PASS - backup.sh - The password used for the borg backup

- CERTBOT_PATH - certs.sh - The path to the certbot installation

- DISCORD_WEBHOOK_URL - notification.sh - The url of the discord webhook for sending notifications

The `~/.pgpass` file must also be set.
