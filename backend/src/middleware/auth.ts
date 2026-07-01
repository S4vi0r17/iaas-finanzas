import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/auth";

export type AuthEnv = {
  Variables: { userId: string };
};

/** Exige un JWT válido en `Authorization: Bearer <token>`. */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return c.json({ error: "No autenticado" }, 401);

  const userId = await verifyToken(token);
  if (!userId) return c.json({ error: "Token inválido o expirado" }, 401);

  c.set("userId", userId);
  await next();
});
