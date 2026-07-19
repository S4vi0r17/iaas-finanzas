// Aplica migraciones manualmente: bun run db:migrate
import { pool, runMigrations } from "./client";

await runMigrations();
console.log("Migraciones aplicadas ✓");
await pool.end();
