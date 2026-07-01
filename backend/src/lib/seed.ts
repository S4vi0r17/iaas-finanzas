import { randomUUID } from "node:crypto";
import { DEFAULT_PAYMENT_METHODS, SEED_OBLIGATIONS } from "@iaas/shared";
import { db } from "../db/client";
import { obligations, paymentMethods } from "../db/schema";

/** Crea los medios de pago y obligaciones por defecto para un usuario nuevo. */
export function seedUserData(userId: string) {
  db.insert(paymentMethods)
    .values(
      DEFAULT_PAYMENT_METHODS.map((pm) => ({
        id: randomUUID(),
        userId,
        slot: pm.slot,
        name: pm.name,
        type: pm.type,
        active: pm.active,
      })),
    )
    .run();

  db.insert(obligations)
    .values(
      SEED_OBLIGATIONS.map((o, i) => ({
        id: randomUUID(),
        userId,
        nombre: o.nombre,
        fechaVenc: o.fechaVenc,
        dia: o.dia,
        monto: o.monto,
        cat: o.cat,
        catCustom: o.catCustom,
        tipo: o.tipo,
        moneda: o.moneda,
        metodoPago: o.metodoPago,
        sortOrder: i,
      })),
    )
    .run();
}
