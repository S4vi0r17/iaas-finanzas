# IAAS Finanzas

Gestor de finanzas personales (monorepo Bun). App móvil + backend propio, basado en el
prototipo `MiTablero_Financiero_Personal.html` pero con un modelo de datos rehecho para
ser mantenible y escalable.

## Estructura

```
packages/shared/   # tipos, constantes y schemas Zod compartidos (@iaas/shared)
backend/           # API Bun + Hono + Drizzle + SQLite (JWT)
app/               # cliente Expo SDK 55 (React Native)  → ver app/README.md
Dockerfile         # imagen del backend (deploy en Dokploy)
```

## Requisitos

- [Bun](https://bun.sh) (el monorepo usa `bunfig.toml` con `linker = "hoisted"`; sin eso Metro falla).

## Correr en local

```bash
bun install                                   # en la raíz, una vez
# Backend:
cd backend && JWT_SECRET=dev DB_PATH=./data/dev.sqlite bun run dev
# App (en otra terminal):
bun run dev:app                               # = cd app && bunx expo start
```

La app lee `EXPO_PUBLIC_API_URL` de `app/.env` (en dispositivo físico, la IP LAN de la PC).

Scripts raíz: `bun run dev:backend`, `bun run dev:app`, `bun run typecheck`.

## Modelo de datos (decisiones clave)

- **Medios de pago:** lista libre por usuario (CRUD). "Borrar" = desactivar (`active:false`).
- **Obligaciones:** gastos fijos recurrentes. Vencimiento = `dia` (1–31). Vigencia por
  `mesInicio` / `mesFin` (opcional): una obligación aplica en el mes M si `mesInicio ≤ M ≤ mesFin`.
- **"Pagada"** no se guarda: una obligación está pagada en un mes si tiene ≥1 **gasto ligado**
  (`expenses.obligation_id`) ese mes. Los estados por fecha (Retrasado/Vence hoy/…) se calculan.
- **Referencias:** FK reales (`payment_method_id`, `obligation_id`) con `ON DELETE SET NULL`.
  `NULL` = "sin asignar".
- **Resumen:** la obligación es una *máscara*, no suma como egreso. Solo cuenta dinero real
  (ingresos + gastos). Cada gasto se clasifica por la obligación que paga (fijo / variable /
  inversión), y se muestra "Pendiente por pagar" (obligaciones vigentes sin gasto ligado).

## Deploy

Backend en Dokploy con el `Dockerfile` de la raíz. El SQLite vive en un volumen persistente
(`/app/data`). En producción poner `ENABLE_DEV_SEED=false`.

## Estado y pendientes

Ver [`PENDIENTES.md`](PENDIENTES.md) para el estado por fase, decisiones de diseño y gaps
(faltan tests versionados y CI).
