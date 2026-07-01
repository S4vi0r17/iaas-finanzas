import type { Context } from "hono";
import type { z } from "zod";

/** Valida el body JSON contra un esquema Zod (lanza ZodError si falla). */
export async function parseBody<T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
): Promise<z.infer<T>> {
  const raw = await c.req.json().catch(() => ({}));
  return schema.parse(raw);
}
