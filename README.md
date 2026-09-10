# cloudflare-ddns-updater

A simple dynamic DNS updater for Cloudflare. It updates a DNS record with your current public IP address.

## Commands

### Setup

Install all dependencies.

```bash
bun install
```

Populate your `.env` file with the required environment variables. They are validated and embedded into the executable during the build.

```bash
{
  echo CF_CRON="0 * * * *"
  echo CF_API_TOKEN="$CF_API_TOKEN"
  echo CF_ZONE_ID="$CF_ZONE_ID"
  echo CF_RECORD_NAME="$CF_RECORD_NAME"
} > .env
```

Build the Bun application as a standalone executable and generate its systemd service.

```bash
bun run build
```

## systemd

Enable and start the linked service:

```bash
sudo systemctl link --force "$PWD/dist/cloudflare-ddns-updater.service"
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflare-ddns-updater
```

After making changes, rebuild and restart the service:

```bash
bun run build
sudo systemctl restart cloudflare-ddns-updater
```

Disable and remove it with:

```bash
sudo systemctl disable --now cloudflare-ddns-updater
sudo systemctl daemon-reload
```
