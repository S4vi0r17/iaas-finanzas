import { updatePaymentMethodsInput, type PaymentMethod, type PmType } from "@iaas/shared";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client";
import { paymentMethods } from "../db/schema";
import { parseBody } from "../lib/http";
import type { AuthEnv } from "../middleware/auth";

function toPm(row: typeof paymentMethods.$inferSelect): PaymentMethod {
  return { slot: row.slot, name: row.name, type: row.type as PmType, active: row.active };
}

export const paymentMethodRoutes = new Hono<AuthEnv>();

paymentMethodRoutes.get("/", (c) => {
  const rows = db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, c.get("userId")))
    .orderBy(asc(paymentMethods.slot))
    .all();
  return c.json({ paymentMethods: rows.map(toPm) });
});

// Actualización masiva desde Ajustes (solo name + active editables).
paymentMethodRoutes.patch("/", async (c) => {
  const userId = c.get("userId");
  const { items } = await parseBody(c, updatePaymentMethodsInput);

  for (const item of items) {
    db.update(paymentMethods)
      .set({ name: item.name, active: item.active })
      .where(and(eq(paymentMethods.userId, userId), eq(paymentMethods.slot, item.slot)))
      .run();
  }

  const rows = db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId))
    .orderBy(asc(paymentMethods.slot))
    .all();
  return c.json({ paymentMethods: rows.map(toPm) });
});
