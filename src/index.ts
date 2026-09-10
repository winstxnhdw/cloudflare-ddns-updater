import { FetchHttpClient, HttpClient, HttpClientResponse } from '@effect/platform';
import Cloudflare from 'cloudflare';
import { Data, Effect } from 'effect';

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

const main = Effect.gen(function* () {
  const cloudflare = new Cloudflare({ apiToken: Bun.env.CF_API_TOKEN }).dns.records;

  const records = yield* Effect.tryPromise({
    catch: (cause) => new CloudflareRecordListError({ cause }),
    try: () =>
      cloudflare.list({
        zone_id: Bun.env.CF_ZONE_ID,
        type: 'A',
        name: { exact: Bun.env.CF_RECORD_NAME },
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
        zone_id: Bun.env.CF_ZONE_ID,
        type: 'A',
        name: Bun.env.CF_RECORD_NAME,
        content: ip,
        ttl: 1,
        proxied: false,
      }),
  });
});

const run = () => Effect.runPromise(main.pipe(Effect.provide(FetchHttpClient.layer)));

await run();
Bun.cron(Bun.env.CF_CRON, run);
