# IAAS Finanzas - Pendientes

Estado y tareas para continuar el desarrollo.

## Estado actual

Fase 1 (nucleo) completa:
- Backend Bun + Hono + Drizzle + SQLite, con JWT, CRUD y seed por usuario. Probado (30/30 e2e) y dockerizado.
- App Expo SDK 55 + NativeWind + TanStack Query.
- 4 pantallas conectadas al backend: Obligaciones, Gastos, Ingresos, Resumen.
- Multi-moneda, medios de pago, navegacion por mes, ajustes, login con sesion persistida.

## Pendientes por fase

### Fase 2 - Notificaciones nativas
- Integrar expo-notifications.
- Alertas locales de obligaciones que vencen (retrasado / vence hoy / proximo).
- Permisos y programacion de recordatorios.

### Fase 3 - WhatsApp
- Envio manual con Linking (wa.me) del resumen del mes.
- Envio automatico via CallMeBot (requiere plan PRO).
- Config de numero y API key en Ajustes.

### Fase 4 - Chat FAQ y Plan PRO
- Chat de preguntas frecuentes (respuestas por palabra clave, como el HTML).
- Plan PRO validado en el servidor (no codigo visible en el cliente).
- Limite de obligaciones gratis ya existe en backend (MAX_FREE_OBLIGATIONS = 10).

## CRUD por completar

Estado actual del CRUD por recurso:
- Obligaciones: crear, editar, borrar, reordenar (backend). "Pagada" ya no es un toggle:
  se deriva de tener >=1 gasto ligado (expenses.obligation_id) en el mes. Vencimiento =
  campo `dia` (1-31) recurrente; la fecha del mes se calcula (ver app/src/lib/obligationStatus.ts).
  Vigencia: cada obligacion tiene mesInicio y mesFin (opcional); el GET ?month filtra a
  las vigentes ese mes. "Dar de baja" = poner mesFin (conserva historia); borrar = quitar
  de todos los meses.
- Usuario: completo (ver, editar).
- Gastos: faltan editar (falta PATCH /api/expenses/:id y su UI). Hoy: crear, listar, borrar.
- Ingresos: faltan editar (falta PATCH /api/incomes/:id y su UI). Hoy: crear, listar, borrar.
- Medios de pago: completo. Lista libre por usuario (no slots fijos). Crear (POST),
  editar nombre/tipo, desactivar (PATCH active:false). UI en Ajustes con "Agregar".
- Reordenar obligaciones: backend listo (PATCH /obligations/reorder), falta UI con flechas.

## Importante (pendiente por resolver)

- Registro sigue creando el usuario VACIO (sin medios de pago). Ya no es bloqueante:
  Ajustes permite agregar medios de pago desde cero con POST /api/payment-methods.
  Pendiente opcional: sembrar unos pocos medios por defecto al registrarse (hoy solo
  los crea /api/seed) para que la cuenta nueva no arranque totalmente vacia.

## Modelo de obligaciones (decisiones de diseno)

- Vigencia: HECHO (mesInicio + mesFin). Falta UI opcional de "dar de baja este mes" con
  un boton (hoy se hace editando el campo mesFin en el formulario).
- Doble conteo en Resumen: RESUELTO. El Resumen ya NO suma obligaciones. La obligacion
  es una "mascara": solo cuenta dinero real (ingresos + gastos). Cada gasto se clasifica
  por la obligacion que paga: ligado a obl. gasto -> gasto fijo; ligado a obl. inversion
  -> inversion; sin ligar -> gasto variable. Ademas muestra "Pendiente por pagar" =
  obligaciones vigentes del mes sin gasto ligado (separadas gasto/inversion).

## Mejoras menores

- Reordenar obligaciones (backend ya soporta PATCH /obligations/reorder; falta UI con flechas).
- Icono, splash y nombre visible de la app (branding IAAS).
- Pantalla de carga/errores mas pulida.

## Endpoint de seed (desarrollo)

- POST /api/seed  (requiere auth) carga medios de pago + obligaciones por defecto en la
  cuenta actual. Idempotente (borra y recrea, no duplica).
- POST /api/seed?wipe=true  ademas borra gastos e ingresos del usuario.
- Se desactiva con ENABLE_DEV_SEED=false (ponlo asi en produccion).

## Notas tecnicas para continuar

- Monorepo Bun. Requiere `bunfig.toml` con `linker = "hoisted"` (si no, Metro/Babel fallan al resolver plugins).
- URL del backend en la app: variable EXPO_PUBLIC_API_URL en app/.env. En dispositivo fisico usar la IP LAN de la PC, no localhost. Reiniciar Expo con `bunx expo start -c` tras cambiarla.
- Backend local: `cd backend && JWT_SECRET=dev DB_PATH=./data/dev.sqlite bun run dev`.
- App: `cd app && bunx expo start`.
- Deploy backend en Dokploy con el Dockerfile de la raiz. El SQLite va en volumen persistente (/app/data).
- Integridad referencial: obligations.payment_method_id, expenses.payment_method_id y
  expenses.obligation_id son FK reales (convencion tabla_id) con ON DELETE SET NULL.
  NULL = "sin asignar" (ya no se usa "" para eso). El input Zod convierte ""/ausente -> null.
- Datos por defecto: constantes SEED_OBLIGATIONS y DEFAULT_PAYMENT_METHODS en packages/shared. Los inserta /api/seed (backend/src/lib/seed.ts), no el registro. DEFAULT_PAYMENT_METHODS usa una `key` interna (ef, cc1, dc1, pr1) solo para enlazar las obligaciones semilla a los ids generados; en la DB cada medio tiene su propio id. Los catalogos (monedas, categorias) son constantes en shared, no estan en la DB.
- Commits: estilo conventional, en ingles, breves, sin coautor. Push por cada paso.
