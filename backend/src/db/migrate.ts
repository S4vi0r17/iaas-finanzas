// Aplica migraciones manualmente: bun run db:migrate
import { runMigrations } from "./client";

runMigrations();
console.log("Migraciones aplicadas ✓");
