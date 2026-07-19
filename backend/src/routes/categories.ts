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

async function listForUser(userId: string, scope?: string): Promise<Category[]> {
  const scopeFilter =
    scope === "obligacion" || scope === "gasto" || scope === "ingreso"
      ? eq(categories.scope, scope)
      : undefined;
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), scopeFilter))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows.map(toCategory);
}

export const categoryRoutes = new Hono<AuthEnv>();

// Lista las categorías del usuario. Con ?scope=obligacion|gasto|ingreso filtra.
categoryRoutes.get("/", async (c) => {
  return c.json({ categories: await listForUser(c.get("userId"), c.req.query("scope")) });
});

// Crear una categoría nueva en un scope.
categoryRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const input = await parseBody(c, createCategoryInput);

  const [maxRow] = await db
    .select({ v: max(categories.sortOrder) })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.scope, input.scope)));
  const nextOrder = (maxRow?.v ?? -1) + 1;

  const id = randomUUID();
  await db.insert(categories).values({
    id,
    userId,
    scope: input.scope,
    name: input.name,
    icon: input.icon,
    active: input.active,
    sortOrder: nextOrder,
  });
  const [row] = await db.select().from(categories).where(eq(categories.id, id));

  return c.json({ category: toCategory(row) }, 201);
});

// Editar (nombre, icono y/o active). Desactivar = active:false (soft-delete).
categoryRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const patch = await parseBody(c, updateCategoryInput);

  const [owned] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.id, id)));
  if (!owned) return c.json({ error: "Categoría no encontrada" }, 404);

  await db
    .update(categories)
    .set(patch)
    .where(and(eq(categories.userId, userId), eq(categories.id, id)));
  const [row] = await db.select().from(categories).where(eq(categories.id, id));
  return c.json({ category: toCategory(row) });
});
