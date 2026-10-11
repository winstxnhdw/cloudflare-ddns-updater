import { BunRuntime, BunServices } from '@effect/platform-bun';
import { Data, Effect } from 'effect';
import { Command, Flag } from 'effect/cli';

class InstallerCompileError extends Data.TaggedError('InstallerCompileError')<{
  readonly cause: unknown;
}> {}

const compile = ({ outfile, target }: Command.Command.Config.Infer<typeof options>) =>
  Effect.gen(function* () {
    const application = yield* Effect.tryPromise({
      catch: (cause) => new InstallerCompileError({ cause }),
      try: () =>
        Bun.build({
          entrypoints: ['src/index.ts'],
          packages: 'bundle',
          target: 'bun',
        }),
    });

    const applicationOutput = application.outputs[0] as Bun.BuildArtifact;
    const applicationSource = yield* Effect.promise(() => applicationOutput.text());
    const applicationDefinition = yield* Effect.try({
      catch: (cause) => new InstallerCompileError({ cause }),
      try: () => JSON.stringify(applicationSource),
    });

    yield* Effect.tryPromise({
      catch: (cause) => new InstallerCompileError({ cause }),
      try: () =>
        Bun.build({
          entrypoints: ['scripts/build.ts'],
          minify: true,
          define: { APPLICATION_SOURCE: applicationDefinition },
          compile: { outfile, target: target as Bun.Build.CompileTarget },
        }),
    });
  });

const options = {
  outfile: Flag.String('outfile').pipe(Flag.withDefault('dist/cloudflare-ddns-updater-installer')),
  target: Flag.String('target').pipe(Flag.withDefault('bun-linux-x64')),
};

const cli = Command.run(Command.make('compile', options, compile), {
  version: 'v1.0.0',
});

BunRuntime.runMain(cli.pipe(Effect.provide(BunServices.layer)));
