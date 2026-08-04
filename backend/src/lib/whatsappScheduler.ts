import { currencySymbol, dueDate } from "@iaas/shared";
import { and, gte, inArray, isNull, like, lte, ne, or, sum } from "drizzle-orm";
import { db } from "../db/client";
import { expenses, obligations, users } from "../db/schema";
import { sendWhatsApp, sleep } from "./whatsapp";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // tick cada 5 min
const SEND_HOUR = Number(process.env.WHATSAPP_DIGEST_HOUR ?? 8); // 08:00 hora del servidor
const PROXIMO_DIAS = 3; // igual que app/src/lib/notifications.ts
const SEND_PACING_MS = 4000; // cortesía entre envíos (evitar patrones de spam en la cuenta)

type Item = { nombre: string; saldo: number; moneda: string };
type Buckets = { hoy: Item[]; proximo: Item[]; atrasado: Item[] };

// En memoria: se resetea en cada redeploy. Peor caso, un digest duplicado o
// saltado el día del redeploy — aceptable, no amerita una tabla nueva.
let lastSentDate: string | null = null;

function localDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startWhatsappScheduler(): void {
  void tick(); // corre al boot: cubre redeploy después de SEND_HOUR sin haber enviado hoy
  setInterval(() => void tick(), CHECK_INTERVAL_MS);
}

async function tick(): Promise<void> {
  const now = new Date();
  const todayKey = localDateKey(now);
  if (now.getHours() < SEND_HOUR) return;
  if (lastSentDate === todayKey) return;
  lastSentDate = todayKey; // se marca antes de esperar, evita reentrancia si un run se solapa
  try {
    await runDailyDigest(now);
  } catch (err) {
    console.error("[whatsapp] Error en el digest diario:", err);
  }
}

async function runDailyDigest(now: Date): Promise<void> {
  const eligibleUsers = await db
    .select({ id: users.id, waPhone: users.waPhone })
    .from(users)
    .where(ne(users.waPhone, ""));
  if (eligibleUsers.length === 0) return;

  const userIds = eligibleUsers.map((u) => u.id);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const rows = await db
    .select()
    .from(obligations)
    .where(
      and(
        inArray(obligations.userId, userIds),
        lte(obligations.mesInicio, monthKey),
        or(isNull(obligations.mesFin), gte(obligations.mesFin, monthKey)),
      ),
    );
  if (rows.length === 0) return;

  const paidRows = await db
    .select({ obligationId: expenses.obligationId, total: sum(expenses.monto).mapWith(Number) })
    .from(expenses)
    .where(and(inArray(expenses.userId, userIds), like(expenses.fecha, `${monthKey}-%`)))
    .groupBy(expenses.obligationId);
  const paidByObligation: Record<string, number> = {};
  for (const r of paidRows) if (r.obligationId) paidByObligation[r.obligationId] = r.total ?? 0;

  const today = new Date(year, month - 1, now.getDate());
  const byUser = new Map<string, Buckets>();

  for (const o of rows) {
    const saldo = Math.round((o.monto - (paidByObligation[o.id] ?? 0)) * 100) / 100;
    if (saldo <= 0) continue;
    const due = dueDate(o.dia, year, month);
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
    const bucket =
      diff < 0 ? "atrasado" : diff === 0 ? "hoy" : diff <= PROXIMO_DIAS ? "proximo" : null;
    if (!bucket) continue;
    if (!byUser.has(o.userId)) byUser.set(o.userId, { hoy: [], proximo: [], atrasado: [] });
    byUser.get(o.userId)![bucket].push({ nombre: o.nombre, saldo, moneda: o.moneda });
  }

  for (const u of eligibleUsers) {
    const buckets = byUser.get(u.id);
    const total = buckets ? buckets.hoy.length + buckets.proximo.length + buckets.atrasado.length : 0;
    if (total === 0) continue; // nada pendiente → no se manda, evita ruido diario
    const ok = await sendWhatsApp(u.waPhone, buildDigestMessage(buckets!));
    if (!ok) console.error(`[whatsapp] Falló el envío del digest al usuario ${u.id}`);
    await sleep(SEND_PACING_MS);
  }
}

function money(amount: number, currency: string): string {
  return `${currencySymbol(currency)} ${Math.round(amount)}`;
}

function buildDigestMessage(b: Buckets): string {
  const lines: string[] = ["📋 Recordatorio de pagos - IAAS Finanzas"];
  if (b.atrasado.length) {
    lines.push("", "🔴 Atrasadas:");
    for (const o of b.atrasado) lines.push(`- ${o.nombre}: ${money(o.saldo, o.moneda)}`);
  }
  if (b.hoy.length) {
    lines.push("", "🟠 Vencen hoy:");
    for (const o of b.hoy) lines.push(`- ${o.nombre}: ${money(o.saldo, o.moneda)}`);
  }
  if (b.proximo.length) {
    lines.push("", `🟡 Próximas (${PROXIMO_DIAS} días):`);
    for (const o of b.proximo) lines.push(`- ${o.nombre}: ${money(o.saldo, o.moneda)}`);
  }
  return lines.join("\n");
}
