import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";
import { resolvePostgresUrl } from "./resolve-connection-string";

// See resolve-connection-string.ts: normalizes whichever connection-string
// env var name is actually present onto POSTGRES_URL, which is the only name
// `@vercel/postgres`'s `sql` client reads (lazily, on first query — so this
// module can be imported safely at build time without a live connection).
resolvePostgresUrl();

export const db = drizzle(sql, { schema });

export * from "./schema";
