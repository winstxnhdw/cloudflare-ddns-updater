import { Command, Options } from '@effect/cli';
import { BunContext, BunRuntime } from '@effect/platform-bun';
import { Data, Effect } from 'effect';

class InstallerCompileError extends Data.TaggedError('InstallerCompileError')<{
  readonly cause: unknown;
}> {}

const compile = ({ outfile, target }: Command.Command.ParseConfig<typeof options>) =>
  Effect.gen(function* () {
    const application = yield* Effect.tryPromise({
      catch: (cause) => new InstallerCompileError({ cause }),
      try: () =>
        Bun.build({
          entrypoints: ['src/index.ts'],
          minify: true,
          packages: 'bundle',
          sourcemap: 'inline',
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
          compile: { outfile, target: target as Bun.Build.CompileTarget },
          define: { APPLICATION_SOURCE: applicationDefinition },
          entrypoints: ['scripts/build.ts'],
          minify: true,
          sourcemap: 'inline',
        }),
    });
  });

const options = {
  outfile: Options.text('outfile').pipe(Options.withDefault('dist/cloudflare-ddns-updater-installer')),
  target: Options.text('target').pipe(Options.withDefault('bun-linux-x64')),
};

const cli = Command.run(Command.make('compile', options, compile), {
  name: 'Installer CLI',
  version: 'v1.0.0',
});

cli(Bun.argv).pipe(Effect.provide(BunContext.layer), BunRuntime.runMain);
