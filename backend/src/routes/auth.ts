import { loginInput, registerInput, type UserProfile } from "@iaas/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { users } from "../db/schema";
import { hashPassword, signToken, verifyPassword } from "../lib/auth";
import { parseBody } from "../lib/http";

export function toProfile(row: typeof users.$inferSelect): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    currency: row.currency,
    waPhone: row.waPhone,
    waKey: row.waKey,
    isPro: row.isPro,
  };
}

export const authRoutes = new Hono();

authRoutes.post("/register", async (c) => {
  const { email, password, name } = await parseBody(c, registerInput);

  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return c.json({ error: "Ese email ya está registrado" }, 409);

  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  db.insert(users).values({ id, email, passwordHash, name }).run();
  // El usuario arranca vacío (sin obligaciones ni medios de pago).
  // Para cargar datos de ejemplo en desarrollo: POST /api/seed

  const row = db.select().from(users).where(eq(users.id, id)).get()!;
  const token = await signToken(id);
  return c.json({ token, user: toProfile(row) }, 201);
});

authRoutes.post("/login", async (c) => {
  const { email, password } = await parseBody(c, loginInput);

  const row = db.select().from(users).where(eq(users.email, email)).get();
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    return c.json({ error: "Credenciales inválidas" }, 401);
  }

  const token = await signToken(row.id);
  return c.json({ token, user: toProfile(row) });
});
