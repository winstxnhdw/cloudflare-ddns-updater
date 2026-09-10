# cloudflare-ddns-updater

[![main.yml](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/main.yml/badge.svg)](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/main.yml)
[![release.yml](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/release.yml/badge.svg)](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/release.yml)
[![format.yml](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/format.yml/badge.svg)](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/format.yml)

A simple dynamic DNS updater for Cloudflare. It updates a DNS record with your current public IP address.

## Usage

Download the installer from the [releases](https://github.com/winstxnhdw/cloudflare-ddns-updater/releases/tag/latest) page and execute it. It will ask for your `Cloudflare API token`, `zone ID`, and `DNS record name`, then generate the `cloudflare-ddns-updater` executable and its `systemd` service in the current directory.

```bash
./cloudflare-ddns-updater-installer
```

Link the `systemd` service and enable it.

```bash
sudo systemctl link "$PWD/cloudflare-ddns-updater.service"
sudo systemctl enable --now cloudflare-ddns-updater
```

To uninstall, simply disable the service.

```bash
sudo systemctl disable --now cloudflare-ddns-updater
```

## Development

Before beginning any development, ensure all dependenc(ies) are installed.

```bash
bun install
```

### Installer

Build the standalone installer with the following.

```bash
bun run compile
```
