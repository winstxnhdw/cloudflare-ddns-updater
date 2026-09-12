# cloudflare-ddns-updater

[![main.yml](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/main.yml/badge.svg)](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/main.yml)
[![release.yml](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/release.yml/badge.svg)](https://github.com/winstxnhdw/cloudflare-ddns-updater/actions/workflows/release.yml)

A portable, zero-dependency, zero-configuration dynamic DNS updater for Cloudflare, compatible with `systemd`. On execution, it schedules a cron job that keeps a DNS record synchronised with the host’s public IP address.

## Usage

Download the appropriate installer for your system from the [releases](https://github.com/winstxnhdw/cloudflare-ddns-updater/releases/tag/latest) page and execute it.

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

Afterwards, the installer will generate the `cloudflare-ddns-updater` executable and its `systemd` service in the current directory. You can link the service with `systemctl`.

```bash
systemctl link "$PWD/cloudflare-ddns-updater.service"
```

Finally, enable and start the service to ensure the updater runs automatically at startup.

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
