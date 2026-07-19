import { randomUUID } from "node:crypto";
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, SEED_OBLIGATIONS } from "@iaas/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { categories, expenses, incomes, obligations, paymentMethods } from "../db/schema";

/**
 * Siembra las categorías por defecto (minimalistas) para un usuario nuevo.
 * Se llama al registrarse: sin ellas los selectores quedarían vacíos.
 */
export async function seedDefaultCategories(userId: string) {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((cat, i) => ({
      id: randomUUID(),
      userId,
      scope: cat.scope,
      name: cat.name,
      icon: cat.icon,
      active: true,
      sortOrder: i,
    })),
  );
}

/**
 * Carga los medios de pago y obligaciones por defecto para un usuario.
 * Idempotente: borra los existentes antes de insertar.
 * Con `wipeMovements` también elimina gastos e ingresos del usuario.
 */
export async function seedUserData(userId: string, opts: { wipeMovements?: boolean } = {}) {
  const now = new Date();
  const mesInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Limpiar catálogo previo
  await db.delete(obligations).where(eq(obligations.userId, userId));
  await db.delete(paymentMethods).where(eq(paymentMethods.userId, userId));
  await db.delete(categories).where(eq(categories.userId, userId));
  if (opts.wipeMovements) {
    await db.delete(expenses).where(eq(expenses.userId, userId));
    await db.delete(incomes).where(eq(incomes.userId, userId));
  }

  // Insertar medios de pago con ids nuevos y recordar key → id para enlazar
  // las obligaciones semilla (que referencian por key).
  // Categorías por defecto (por scope), editables luego por el usuario.
  await seedDefaultCategories(userId);

  const pmIdByKey = new Map<string, string>();
  await db.insert(paymentMethods).values(
    DEFAULT_PAYMENT_METHODS.map((pm, i) => {
      const id = randomUUID();
      pmIdByKey.set(pm.key, id);
      return {
        id,
        userId,
        name: pm.name,
        type: pm.type,
        active: pm.active,
        sortOrder: i,
      };
    }),
  );

  await db.insert(obligations).values(
    SEED_OBLIGATIONS.map((o, i) => ({
      id: randomUUID(),
      userId,
      nombre: o.nombre,
      dia: o.dia,
      mesInicio,
      mesFin: null,
      monto: o.monto,
      cat: o.cat,
      tipo: o.tipo,
      moneda: o.moneda,
      paymentMethodId: pmIdByKey.get(o.paymentMethodId) ?? null,
      sortOrder: i,
    })),
  );

  return {
    paymentMethods: DEFAULT_PAYMENT_METHODS.length,
    obligations: SEED_OBLIGATIONS.length,
    categories: DEFAULT_CATEGORIES.length,
  };
}
