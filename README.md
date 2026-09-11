# cloudflare-ddns-updater

[![main.yml](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/main.yml/badge.svg)](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/main.yml)
[![release.yml](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/release.yml/badge.svg)](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/release.yml)

A simple dynamic DNS updater for Cloudflare. It updates a DNS record with your current public IP address.

## Usage

Download the installer from the [releases](https://github.com/winstxnhdw/cloudflare-ddns-updater/releases/tag/latest) page and execute it. This will generate the `cloudflare-ddns-updater` executable and its `systemd` service in the current directory.

```bash
./cloudflare-ddns-updater-installer*
```

Enter your API token.

```console
? Cloudflare API token › *****************************************************
```

Enter your zone ID.

```console
? Cloudflare zone ID › 608e1b0af4acf53f4cc407191741c713
```

Enter your DNS record name.

```console
? DNS record name › example.com
```

Enter your desired cron schedule.

```console
? Cron schedule › 0 * * * *
```

Link the `systemd` service.

```bash
systemctl link "$PWD/cloudflare-ddns-updater.service"
```

Enable and start the service.

```bash
systemctl enable --now cloudflare-ddns-updater
```

To uninstall, simply disable the service.

```bash
systemctl disable --now cloudflare-ddns-updater
```

## Development

Before beginning any development, ensure all dependenc(ies) are installed.

```bash
bun install
```

### Installer

Build the standalone installer with the following.

```bash
bun compile
```
