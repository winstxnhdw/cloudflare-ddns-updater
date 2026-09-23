import { userInfo } from 'node:os';
import { Prompt } from '@effect/cli';
import { FileSystem, Path } from '@effect/platform';
import { BunContext, BunRuntime } from '@effect/platform-bun';
import { Data, Effect, Predicate, Redacted, Schema } from 'effect';

declare const APPLICATION_SOURCE: string;

class ExecutableBuildError extends Data.TaggedError('ExecutableBuildError')<{
  readonly cause: unknown;
}> {}

class ExecutablePermissionError extends Data.TaggedError('ExecutablePermissionError')<{
  readonly cause: unknown;
}> {}

class WorkingDirectoryResolutionError extends Data.TaggedError('WorkingDirectoryResolutionError')<{
  readonly cause: unknown;
}> {}

class UserLookupError extends Data.TaggedError('UserLookupError')<{
  readonly cause: unknown;
}> {}

class ExecutablePathResolutionError extends Data.TaggedError('ExecutablePathResolutionError')<{
  readonly cause: unknown;
}> {}

class ServiceWriteError extends Data.TaggedError('ServiceWriteError')<{
  readonly cause: unknown;
}> {}

const serviceContents = (executablePath: string) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;

    const workingDirectory = yield* Effect.try({
      try: () => path.resolve('.'),
      catch: (cause) => new WorkingDirectoryResolutionError({ cause }),
    });

    const username = yield* Effect.try({
      try: () => userInfo().username,
      catch: (cause) => new UserLookupError({ cause }),
    });

    const absoluteExecutablePath = yield* Effect.try({
      try: () => path.join(workingDirectory, executablePath),
      catch: (cause) => new ExecutablePathResolutionError({ cause }),
    });

    const contents = [
      '[Unit]',
      'Description=Cloudflare dynamic DNS updater',
      '[Service]',
      'Type=exec',
      `User=${username}`,
      `ExecStart=${absoluteExecutablePath}`,
      'Restart=on-failure',
      'RestartSec=30s',
      'NoNewPrivileges=yes',
      'PrivateDevices=yes',
      'PrivateTmp=yes',
      'ProtectControlGroups=yes',
      'ProtectKernelModules=yes',
      'ProtectKernelTunables=yes',
      'ProtectSystem=strict',
      'RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6',
      'RestrictRealtime=yes',
      'RestrictSUIDSGID=yes',
      'LockPersonality=yes',
      'CapabilityBoundingSet=',
      '[Install]',
      'WantedBy=multi-user.target',
    ];

    return contents.join('\n');
  });

const required = (value: string) =>
  Schema.decodeUnknown(Schema.NonEmptyString)(value).pipe(Effect.mapError(() => 'A value is required'));

const cron = (value: string) =>
  Effect.try({ try: () => Bun.cron.parse(value), catch: () => 'Invalid cron schedule' }).pipe(
    Effect.filterOrFail(Predicate.isNotNull, () => 'Schedule has no future occurrences'),
    Effect.as(value),
  );

const build = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const applicationEntrypoint = 'src/index.ts';
  const executablePath = 'cloudflare-ddns-updater';

  const input = yield* Prompt.all({
    apiToken: Prompt.password({ message: 'Cloudflare API token', validate: required }),
    zoneId: Prompt.text({ message: 'Cloudflare zone ID', validate: required }),
    recordName: Prompt.text({ message: 'DNS record name', validate: required }),
    cron: Prompt.text({ message: 'Cron schedule', default: '0 * * * *', validate: cron }),
  });

  const define = yield* Effect.try({
    catch: (cause) => new ExecutableBuildError({ cause }),
    try: () => ({
      'Bun.env.CF_API_TOKEN': JSON.stringify(Redacted.value(input.apiToken)),
      'Bun.env.CF_CRON': JSON.stringify(input.cron),
      'Bun.env.CF_ZONE_ID': JSON.stringify(input.zoneId),
      'Bun.env.CF_RECORD_NAME': JSON.stringify(input.recordName),
    }),
  });

  yield* Effect.tryPromise({
    catch: (cause) => new ExecutableBuildError({ cause }),
    try: () =>
      Bun.build({
        define,
        entrypoints: [applicationEntrypoint],
        files: { [applicationEntrypoint]: APPLICATION_SOURCE },
        minify: true,
        sourcemap: 'linked',
        compile: {
          outfile: executablePath,
          windows: { hideConsole: true },
        },
      }),
  });

  yield* fileSystem
    .chmod(executablePath, 0o700)
    .pipe(Effect.mapError((cause) => new ExecutablePermissionError({ cause })));

  yield* fileSystem
    .writeFileString(`${executablePath}.service`, yield* serviceContents(executablePath))
    .pipe(Effect.mapError((cause) => new ServiceWriteError({ cause })));
});

BunRuntime.runMain(build.pipe(Effect.provide(BunContext.layer)));
