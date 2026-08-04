import { updateUserInput, whatsappTestInput } from "@iaas/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client";
import { users } from "../db/schema";
import { parseBody } from "../lib/http";
import { sendWhatsApp } from "../lib/whatsapp";
import type { AuthEnv } from "../middleware/auth";
import { toProfile } from "./auth";

export const userRoutes = new Hono<AuthEnv>();

// Cooldown simple en memoria para que un usuario no pueda spamear el botón
// de prueba (la cuenta de WhatsApp es compartida por todos los usuarios).
const TEST_COOLDOWN_MS = 60_000;
const lastTestSentAt = new Map<string, number>();

userRoutes.get("/me", async (c) => {
  const [row] = await db.select().from(users).where(eq(users.id, c.get("userId")));
  if (!row) return c.json({ error: "Usuario no encontrado" }, 404);
  return c.json({ user: toProfile(row) });
});

userRoutes.patch("/me", async (c) => {
  const patch = await parseBody(c, updateUserInput);
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, c.get("userId")));
  }
  const [row] = await db.select().from(users).where(eq(users.id, c.get("userId")));
  return c.json({ user: toProfile(row) });
});

/** Manda un WhatsApp de prueba al número indicado (no hace falta guardarlo antes). */
userRoutes.post("/me/whatsapp-test", async (c) => {
  const userId = c.get("userId");
  const { phone } = await parseBody(c, whatsappTestInput);

  const last = lastTestSentAt.get(userId) ?? 0;
  const waitMs = TEST_COOLDOWN_MS - (Date.now() - last);
  if (waitMs > 0) {
    return c.json({ error: `Esperá ${Math.ceil(waitMs / 1000)}s antes de otra prueba` }, 429);
  }
  lastTestSentAt.set(userId, Date.now());

  const ok = await sendWhatsApp(
    phone,
    "✅ Prueba de IAAS Finanzas — si ves esto, los recordatorios van a llegarte a este número.",
  );
  if (!ok) return c.json({ error: "No se pudo enviar (revisá que la sesión de WhatsApp esté lista)" }, 502);
  return c.json({ ok: true });
});
