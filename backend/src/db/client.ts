import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL no configurado");

const pool = mysql.createPool(DATABASE_URL);

export const db = drizzle(pool, { schema, mode: "default" });
export { schema, pool };

/** Aplica las migraciones pendientes (se llama al arrancar). */
export function runMigrations() {
  return migrate(db, { migrationsFolder: "./drizzle" });
}
