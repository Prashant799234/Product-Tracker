/**
 * `@vercel/postgres`'s `sql` client and `drizzle-kit` both only ever read
 * `process.env.POSTGRES_URL`. Depending on how the Postgres/Neon integration
 * was added in the Vercel dashboard, the actual injected variable can be
 * named differently:
 *  - the older native "Vercel Postgres" integration used `POSTGRES_URL`
 *  - the current Neon marketplace integration uses `DATABASE_URL`
 *  - if the Neon resource/integration was given a custom name (e.g. "Tracker"),
 *    Vercel prefixes every variable with it, e.g. `Tracker_DATABASE_URL`
 *
 * This resolves whichever one is actually present and mirrors it onto
 * `POSTGRES_URL` so the rest of the app never has to think about it.
 */
export function resolvePostgresUrl(): string | undefined {
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;

  if (process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
    return process.env.POSTGRES_URL;
  }

  const prefixedKey = Object.keys(process.env).find(
    (key) => /_(POSTGRES_URL|DATABASE_URL)$/.test(key) && process.env[key]
  );
  if (prefixedKey) {
    process.env.POSTGRES_URL = process.env[prefixedKey];
    return process.env.POSTGRES_URL;
  }

  return undefined;
}
