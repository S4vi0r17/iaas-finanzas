import { updateUserInput } from "@iaas/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client";
import { users } from "../db/schema";
import { parseBody } from "../lib/http";
import type { AuthEnv } from "../middleware/auth";
import { toProfile } from "./auth";

export const userRoutes = new Hono<AuthEnv>();

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
