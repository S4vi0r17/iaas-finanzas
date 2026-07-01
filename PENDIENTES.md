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
- Obligaciones: completo (crear, editar, borrar, marcar pagada, reordenar en backend).
- Usuario: completo (ver, editar).
- Gastos: faltan editar (falta PATCH /api/expenses/:id y su UI). Hoy: crear, listar, borrar.
- Ingresos: faltan editar (falta PATCH /api/incomes/:id y su UI). Hoy: crear, listar, borrar.
- Medios de pago: falta crear real (upsert) para usuarios vacios y la UI en Ajustes.
  Hoy: listar y editar por slot existente.
- Reordenar obligaciones: backend listo (PATCH /obligations/reorder), falta UI con flechas.

## Importante (pendiente por resolver)

- Registro ahora crea el usuario VACIO (sin medios de pago). La UI de Ajustes hoy solo
  edita slots existentes (PATCH por slot), asi que un usuario real nuevo no puede crear
  sus medios de pago sin llamar a /api/seed. Pendiente: que el guardado de medios de pago
  haga upsert (crear si no existe) y que Ajustes muestre los 14 slots por defecto aunque
  no existan aun en la DB.

## Mejoras menores

- Selector de fecha nativo (@react-native-community/datetimepicker). Hoy la fecha se ingresa como texto AAAA-MM-DD.
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
- Datos por defecto: constantes SEED_OBLIGATIONS y DEFAULT_PAYMENT_METHODS en packages/shared. Se insertan al registrar usuario (backend/src/lib/seed.ts). Los catalogos (monedas, categorias) son constantes en shared, no estan en la DB.
- Commits: estilo conventional, en ingles, breves, sin coautor. Push por cada paso.
