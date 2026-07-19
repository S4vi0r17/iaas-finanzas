# IAAS Finanzas

Gestor de finanzas personales (monorepo Bun). App móvil + backend propio, basado en el
prototipo `MiTablero_Financiero_Personal.html` pero con un modelo de datos rehecho para
ser mantenible y escalable.

## Estructura

```
packages/shared/   # tipos, constantes y schemas Zod compartidos (@iaas/shared)
backend/           # API Bun + Hono + Drizzle + MySQL (JWT)
app/               # cliente Expo SDK 55 (React Native)  → ver app/README.md
Dockerfile         # imagen del backend (deploy en Dokploy)
```

## Requisitos

- [Bun](https://bun.sh) (el monorepo usa `bunfig.toml` con `linker = "hoisted"`; sin eso Metro falla).
- Un MySQL corriendo (local: `docker run -d --name iaas-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=iaas -p 3306:3306 mysql:8`).

## Correr en local

```bash
bun install                                   # en la raíz, una vez
# Backend:
cd backend && JWT_SECRET=dev DATABASE_URL=mysql://root:root@localhost:3306/iaas bun run dev
# App (en otra terminal):
bun run dev:app                               # = cd app && bunx expo start
```

La app lee `EXPO_PUBLIC_API_URL` de `app/.env` (en dispositivo físico, la IP LAN de la PC).

Scripts raíz: `bun run dev:backend`, `bun run dev:app`, `bun run typecheck`.

## Modelo de datos (decisiones clave)

- **Medios de pago:** lista libre por usuario (CRUD). "Borrar" = desactivar (`active:false`).
- **Obligaciones = plantilla (menú) mutable:** gastos fijos recurrentes. Vencimiento = `dia`
  (1–31). Vigencia por `mesInicio` / `mesFin` (opcional): aplica en el mes M si
  `mesInicio ≤ M ≤ mesFin`. Editar una obligación solo afecta el plan de ahí en adelante.
- **Gasto = snapshot inmutable:** cada gasto congela su propio `monto`, `tipo`
  (`variable` / `fijo` / `inversion`), categoría y moneda. Editar la obligación NUNCA reescribe
  pagos pasados. Un gasto suelto es `variable`; un pago de obligación congela `fijo`/`inversion`.
- **Pago desde la obligación:** se paga con `POST /obligations/:id/pay` (botón "Pagar" en su
  pestaña), que crea el gasto snapshot ligado. Soporta **pagos parciales** (varios pagos
  acumulan) y **no permite sobrepago** (`monto ≤ saldo`). Estado del mes derivado del acumulado:
  Pendiente (0) / **Parcial** (0 < pagado < monto) / Pagado (pagado ≥ monto).
- **Referencias:** FK reales (`payment_method_id`, `obligation_id`) con `ON DELETE SET NULL`.
  `NULL` = "sin asignar".
- **Resumen:** la obligación no suma como egreso; solo cuenta dinero real (ingresos + gastos).
  Cada gasto se clasifica por su `tipo` snapshot (sin mirar la obligación viva). Muestra KPIs
  (tasa de ahorro, gasto fijo, pendiente) y "Pendiente por pagar" = saldo de obligaciones del mes.

## Deploy

Backend en Dokploy con el `Dockerfile` de la raíz. La base MySQL se crea aparte con el
"database creator" de Dokploy y se referencia vía `DATABASE_URL`. En producción poner
`ENABLE_DEV_SEED=false`.

## Estado y pendientes

Ver [`PENDIENTES.md`](PENDIENTES.md) para el estado por fase, decisiones de diseño y gaps
(faltan tests versionados y CI).
