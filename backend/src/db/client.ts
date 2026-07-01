import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

const DB_PATH = process.env.DB_PATH ?? "./data/iaas.sqlite";

mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
export { schema, sqlite };

/** Aplica las migraciones pendientes (se llama al arrancar). */
export function runMigrations() {
  migrate(db, { migrationsFolder: "./drizzle" });
}
