import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

// bun:sqlite is native to Bun, so this driver — and the whole database
// engine — bundles cleanly into a single binary with `bun build --compile`.
const sqlite = new Database(process.env.DATABASE_PATH ?? "sqlite.db");
sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export * from "./schema";
