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

## Mejoras menores

- Selector de fecha nativo (@react-native-community/datetimepicker). Hoy la fecha se ingresa como texto AAAA-MM-DD.
- Reordenar obligaciones (backend ya soporta PATCH /obligations/reorder; falta UI con flechas).
- Endpoint opcional para reiniciar/re-sembrar datos del usuario (ver notas).
- Icono, splash y nombre visible de la app (branding IAAS).
- Pantalla de carga/errores mas pulida.

## Notas tecnicas para continuar

- Monorepo Bun. Requiere `bunfig.toml` con `linker = "hoisted"` (si no, Metro/Babel fallan al resolver plugins).
- URL del backend en la app: variable EXPO_PUBLIC_API_URL en app/.env. En dispositivo fisico usar la IP LAN de la PC, no localhost. Reiniciar Expo con `bunx expo start -c` tras cambiarla.
- Backend local: `cd backend && JWT_SECRET=dev DB_PATH=./data/dev.sqlite bun run dev`.
- App: `cd app && bunx expo start`.
- Deploy backend en Dokploy con el Dockerfile de la raiz. El SQLite va en volumen persistente (/app/data).
- Datos por defecto: constantes SEED_OBLIGATIONS y DEFAULT_PAYMENT_METHODS en packages/shared. Se insertan al registrar usuario (backend/src/lib/seed.ts). Los catalogos (monedas, categorias) son constantes en shared, no estan en la DB.
- Commits: estilo conventional, en ingles, breves, sin coautor. Push por cada paso.
