import { userInfo } from 'node:os';
import { FileSystem, Path } from '@effect/platform';
import { BunContext, BunRuntime } from '@effect/platform-bun';
import { Data, Effect, Schema } from 'effect';

class ExecutableBuildError extends Data.TaggedError('ExecutableBuildError')<{
  readonly cause: unknown;
}> {}

class ExecutablePermissionError extends Data.TaggedError('ExecutablePermissionError')<{
  readonly cause: unknown;
}> {}

class CronScheduleValidationError extends Data.TaggedError('CronScheduleValidationError')<{
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
      'RestartSec=5s',
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

const build = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const executablePath = 'dist/cloudflare-ddns-updater';

  const envSchema = Schema.Struct({
    CF_API_TOKEN: Schema.NonEmptyString,
    CF_CRON: Schema.NonEmptyString,
    CF_ZONE_ID: Schema.NonEmptyString,
    CF_RECORD_NAME: Schema.NonEmptyString,
  });

  const env = yield* Schema.decodeUnknown(envSchema, { errors: 'all' })({
    CF_API_TOKEN: process.env.CF_API_TOKEN,
    CF_CRON: process.env.CF_CRON,
    CF_ZONE_ID: process.env.CF_ZONE_ID,
    CF_RECORD_NAME: process.env.CF_RECORD_NAME,
  });

  yield* Effect.try({
    catch: (cause) => new CronScheduleValidationError({ cause }),
    try: () => {
      if (Bun.cron.parse(env.CF_CRON) === null) throw new Error('Cron schedule has no future occurrences');
    },
  });

  yield* Effect.tryPromise({
    catch: (cause) => new ExecutableBuildError({ cause }),
    try: () =>
      Bun.build({
        entrypoints: ['src/index.ts'],
        env: 'CF_*',
        minify: true,
        sourcemap: 'linked',
        compile: {
          autoloadDotenv: false,
          outfile: executablePath,
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

build.pipe(Effect.provide(BunContext.layer), BunRuntime.runMain);
