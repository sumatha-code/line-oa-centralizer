import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

const pool = globalForDb.conn ?? new Pool({ connectionString: databaseUrl });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = pool;
}

export const db = drizzle(pool, { schema });
