import { randomUUID } from "node:crypto";
import {
  createCategoryInput,
  updateCategoryInput,
  type Category,
  type CategoryScope,
} from "@iaas/shared";
import { and, asc, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client";
import { categories } from "../db/schema";
import { parseBody } from "../lib/http";
import type { AuthEnv } from "../middleware/auth";

function toCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    scope: row.scope as CategoryScope,
    name: row.name,
    icon: row.icon,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

function listForUser(userId: string, scope?: string): Category[] {
  const scopeFilter =
    scope === "obligacion" || scope === "gasto" || scope === "ingreso"
      ? eq(categories.scope, scope)
      : undefined;
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), scopeFilter))
    .orderBy(asc(categories.sortOrder), asc(categories.name))
    .all()
    .map(toCategory);
}

export const categoryRoutes = new Hono<AuthEnv>();

// Lista las categorías del usuario. Con ?scope=obligacion|gasto|ingreso filtra.
categoryRoutes.get("/", (c) => {
  return c.json({ categories: listForUser(c.get("userId"), c.req.query("scope")) });
});

// Crear una categoría nueva en un scope.
categoryRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const input = await parseBody(c, createCategoryInput);

  const nextOrder =
    (db
      .select({ v: max(categories.sortOrder) })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.scope, input.scope)))
      .get()?.v ?? -1) + 1;

  const row = db
    .insert(categories)
    .values({
      id: randomUUID(),
      userId,
      scope: input.scope,
      name: input.name,
      icon: input.icon,
      active: input.active,
      sortOrder: nextOrder,
    })
    .returning()
    .get();

  return c.json({ category: toCategory(row) }, 201);
});

// Editar (nombre, icono y/o active). Desactivar = active:false (soft-delete).
categoryRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const patch = await parseBody(c, updateCategoryInput);

  const row = db
    .update(categories)
    .set(patch)
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
    .returning()
    .get();

  if (!row) return c.json({ error: "Categoría no encontrada" }, 404);
  return c.json({ category: toCategory(row) });
});
