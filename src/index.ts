import { FetchHttpClient, HttpClient, HttpClientResponse } from '@effect/platform';
import { BunRuntime } from '@effect/platform-bun';
import Cloudflare from 'cloudflare';
import { Data, Effect, Runtime } from 'effect';

declare module 'bun' {
  interface Env {
    readonly CF_API_TOKEN: string;
    readonly CF_CRON: string;
    readonly CF_RECORD_NAME: string;
    readonly CF_ZONE_ID: string;
  }
}

class CloudflareRecordListError extends Data.TaggedError('CloudflareRecordListError')<{
  readonly cause: unknown;
}> {}

class CloudflareRecordEditError extends Data.TaggedError('CloudflareRecordEditError')<{
  readonly cause: unknown;
}> {}

class IPAddressError extends Data.TaggedError('IPAddressError')<{
  readonly cause: unknown;
}> {}

class CronRegistrationError extends Data.TaggedError('CronRegistrationError')<{
  readonly cause: unknown;
}> {}

const updater = Effect.gen(function* () {
  const cloudflare = new Cloudflare({ apiToken: Bun.env.CF_API_TOKEN }).dns.records;

  const records = yield* Effect.tryPromise({
    catch: (cause) => new CloudflareRecordListError({ cause }),
    try: () =>
      cloudflare.list({
        name: { exact: Bun.env.CF_RECORD_NAME },
        zone_id: Bun.env.CF_ZONE_ID,
        type: 'A',
      }),
  });

  const ip = yield* HttpClient.get('https://api.ipify.org').pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(({ text }) => text),
    Effect.mapError((cause) => new IPAddressError({ cause })),
  );

  yield* Effect.tryPromise({
    catch: (cause) => new CloudflareRecordEditError({ cause }),
    try: () =>
      cloudflare.edit(records.result[0]?.id ?? '', {
        name: Bun.env.CF_RECORD_NAME,
        zone_id: Bun.env.CF_ZONE_ID,
        type: 'A',
        content: ip,
        ttl: 1,
        proxied: false,
      }),
  });
});

const main = Effect.gen(function* () {
  const effectRuntime = yield* Effect.runtime<never>();
  const runnableUpdater = updater.pipe(Effect.provide(FetchHttpClient.layer));

  yield* runnableUpdater;
  yield* Effect.try({
    try: () => Bun.cron(Bun.env.CF_CRON, () => Runtime.runPromise(effectRuntime,runnableUpdater)),
    catch: (cause) => new CronRegistrationError({ cause }),
  });

  return yield* Effect.never;
});

BunRuntime.runMain(main);
