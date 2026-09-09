import { userInfo } from 'node:os';

const result = await Bun.build({
  entrypoints: ['src/index.ts'],
  env: 'CF_*',
  minify: true,
  sourcemap: 'external',
  compile: {
    autoloadDotenv: false,
    outfile: 'dist/cloudflare-ddns-updater',
  },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const serviceContents = `[Unit]
Description=Cloudflare dynamic DNS updater
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=${userInfo().username}
WorkingDirectory=${process.cwd()}
ExecStart=${process.cwd()}/dist/cloudflare-ddns-updater
Restart=on-failure
RestartSec=5s

NoNewPrivileges=yes
PrivateDevices=yes
PrivateTmp=yes
ProtectControlGroups=yes
ProtectHome=read-only
ProtectKernelModules=yes
ProtectKernelTunables=yes
ProtectSystem=strict
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
RestrictRealtime=yes
RestrictSUIDSGID=yes
LockPersonality=yes
CapabilityBoundingSet=

[Install]
WantedBy=multi-user.target
`;

await Bun.write('dist/cloudflare-ddns-updater.service', serviceContents);
