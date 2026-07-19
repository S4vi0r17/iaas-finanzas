import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "../db/client";
import { users } from "../db/schema";
import { verifyToken } from "../lib/auth";

export type AuthEnv = {
  Variables: { userId: string };
};

/**
 * Exige un JWT válido en `Authorization: Bearer <token>`.
 * Además de verificar la firma, confirma que el usuario del token siga
 * existiendo (p. ej. tras un reset de DB en un redeploy, o cuenta eliminada):
 * sin esto, el token seguía "pasando" pero cualquier INSERT que referenciara
 * ese userId reventaba con FOREIGN KEY constraint failed (500) en vez de 401.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return c.json({ error: "No autenticado" }, 401);

  const userId = await verifyToken(token);
  if (!userId) return c.json({ error: "Token inválido o expirado" }, 401);

  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!exists) return c.json({ error: "Sesión inválida" }, 401);

  c.set("userId", userId);
  await next();
});
