import { FetchHttpClient, HttpClient, HttpClientResponse } from '@effect/platform';
import Cloudflare from 'cloudflare';
import { Data, Effect, Schema } from 'effect';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly CF_API_TOKEN?: string;
      readonly CF_ZONE_ID?: string;
      readonly CF_RECORD_NAME?: string;
    }
  }
}

class CloudflareAPIError extends Data.TaggedError('CloudflareAPIError')<{
  readonly operation: 'listRecords' | 'editRecord';
  readonly cause: unknown;
}> {}

class IPAddressError extends Data.TaggedError('IPAddressError')<{
  readonly cause: unknown;
}> {}

const EnvSchema = Schema.Struct({
  CF_API_TOKEN: Schema.NonEmptyString,
  CF_ZONE_ID: Schema.NonEmptyString,
  CF_RECORD_NAME: Schema.NonEmptyString,
});

const main = Effect.gen(function* () {
  const env = yield* Schema.decodeUnknown(EnvSchema, { errors: 'all' })({
    CF_API_TOKEN: process.env.CF_API_TOKEN,
    CF_ZONE_ID: process.env.CF_ZONE_ID,
    CF_RECORD_NAME: process.env.CF_RECORD_NAME,
  });
  const cloudflare = new Cloudflare({
    apiToken: env.CF_API_TOKEN,
  });

  const records = yield* Effect.tryPromise({
    catch: (cause) => new CloudflareAPIError({ operation: 'listRecords', cause }),
    try: () =>
      cloudflare.dns.records.list({
        zone_id: env.CF_ZONE_ID,
        type: 'A',
        name: { exact: env.CF_RECORD_NAME },
      }),
  });

  const ip = yield* HttpClient.get('https://api.ipify.org').pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap(({ text }) => text),
    Effect.mapError((cause) => new IPAddressError({ cause })),
  );

  yield* Effect.tryPromise({
    catch: (cause) => new CloudflareAPIError({ operation: 'editRecord', cause }),
    try: () =>
      cloudflare.dns.records.edit(records.result[0]?.id ?? '', {
        zone_id: env.CF_ZONE_ID,
        type: 'A',
        name: env.CF_RECORD_NAME,
        content: ip,
        ttl: 1,
        proxied: false,
      }),
  });
});

Bun.cron('0 * * * *', () => Effect.runPromise(main.pipe(Effect.provide(FetchHttpClient.layer))));
