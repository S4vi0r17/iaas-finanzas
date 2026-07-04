# IAAS Finanzas — App (Expo)

App móvil de finanzas personales. Cliente Expo SDK 55 (React Native) que consume el backend
del monorepo. Ver el [README raíz](../README.md) para el panorama completo.

## Stack

- Expo SDK 55 + Expo Router (file-based routing en `src/app`)
- NativeWind (Tailwind para RN)
- TanStack Query para data fetching/cache
- Tipos y validación compartidos desde `@iaas/shared`

## Correr en local

Desde la raíz del monorepo (usa Bun, no npm):

```bash
bun install            # una sola vez, en la raíz
bun run dev:backend    # levanta el backend (ver README raíz)
bun run dev:app        # = cd app && bunx expo start
```

Configura la URL del backend en `app/.env`:

```
EXPO_PUBLIC_API_URL=http://TU_IP_LAN:3000
```

- En dispositivo físico usá la **IP LAN** de tu PC, no `localhost`.
- Tras cambiar el `.env`, reiniciá con cache limpio: `bunx expo start -c`.

## Estructura

```
src/
  app/            # rutas (Expo Router): login, (tabs)/index|gastos|ingresos|resumen
  components/     # ObligationForm, ObligationPaySheet, ExpenseForm, IncomeForm, SettingsSheet, ui/
  hooks/          # queries (TanStack), useMonth
  lib/            # api, auth, config, format, obligationStatus
```

## Notas

- Las obligaciones se **pagan desde su pestaña** con el botón "Pagar" (`ObligationPaySheet`):
  soporta pagos parciales y no permite sobrepago. La pestaña Gastos muestra solo gastos
  variables (`tipo === 'variable'`).
- Los estados de una obligación se calculan en `src/lib/obligationStatus.ts` a partir de cuánto
  se pagó ese mes (`paidByObligation` del backend) y el `dia` de vencimiento:
  **Pagado** (pagado ≥ monto) / **Parcial** (0 < pagado < monto) / Retrasado / Vence hoy /
  Próximo / Pendiente.
- Antes de escribir código nuevo, leer `AGENTS.md` (docs versionadas de Expo v55).
- Para compilar (APK debug, build local, EAS, publicar en stores), ver [`BUILD.md`](BUILD.md).
