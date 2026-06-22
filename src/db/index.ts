import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazily create the Drizzle client so importing this module (e.g. during
// `next build` page-data collection) doesn't require DATABASE_URL — it's only
// needed when a query actually runs.
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  _db = drizzle(neon(connectionString), { schema });
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb();
    const value = real[prop as keyof typeof real];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
