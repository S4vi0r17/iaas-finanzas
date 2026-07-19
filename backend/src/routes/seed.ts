import { Hono } from "hono";
import { seedUserData } from "../lib/seed";
import type { AuthEnv } from "../middleware/auth";

// Endpoint solo para desarrollo: carga datos de ejemplo en la cuenta actual.
// Desactívalo en producción con ENABLE_DEV_SEED=false.
export const seedRoutes = new Hono<AuthEnv>();

seedRoutes.post("/", async (c) => {
  if (process.env.ENABLE_DEV_SEED === "false") {
    return c.json({ error: "Seed deshabilitado" }, 403);
  }
  const wipeMovements = c.req.query("wipe") === "true";
  const result = await seedUserData(c.get("userId"), { wipeMovements });
  return c.json({ ok: true, seeded: result, wipedMovements: wipeMovements });
});
