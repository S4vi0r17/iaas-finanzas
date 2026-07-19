# IAAS Finanzas - Pendientes

Estado y tareas para continuar el desarrollo.

## Estado actual

Fase 1 (nucleo) completa, con el modelo de datos ya mejorado por encima del HTML de referencia:
- Backend Bun + Hono + Drizzle + MySQL, con JWT, CRUD y seed por usuario. Dockerizado.
- App Expo SDK 55 + NativeWind + TanStack Query.
- 4 pantallas conectadas al backend: Obligaciones, Gastos, Ingresos, Resumen.
- Multi-moneda, medios de pago (CRUD individual), navegacion por mes, ajustes, login persistido.

Mejoras de modelo ya aplicadas (detalle en las secciones de abajo):
- Medios de pago: lista libre por usuario (ya no 14 slots fijos).
- FK reales con ON DELETE SET NULL (payment_method_id, obligation_id).
- Obligaciones: vencimiento por `dia` recurrente + vigencia (mesInicio / mesFin opcional).
- Modelo plantilla + snapshot: la obligacion es una plantilla mutable; cada gasto congela su
  propio `tipo` (variable/fijo/inversion). Editar una obligacion no reescribe pagos pasados.
- Pago desde la obligacion (POST /obligations/:id/pay): boton "Pagar" con pagos parciales
  (acumulan) y sin sobrepago. Estado del mes derivado del acumulado: Pendiente / Parcial / Pagado.
- Resumen sin doble conteo: solo cuenta dinero real (ingresos + gastos), clasificando por el
  `tipo` snapshot del gasto. KPIs: tasa de ahorro, gasto fijo %, pendiente por pagar.

Estado de pruebas: `bun run typecheck` pasa en shared/backend/app. El flujo de pago se verifico
e2e contra el backend (pago parcial, acumulado, guard de sobrepago 400, 409 al re-pagar, snapshot
de tipo, guard de vigencia). NO hay suite de tests versionada ni CI (ver Gaps).

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
- Obligaciones: crear, editar, borrar, reordenar (backend). Se **pagan** desde su pestaña con
  el boton "Pagar" (ObligationPaySheet): POST /obligations/:id/pay crea un gasto snapshot ligado,
  con pagos parciales y sin sobrepago; deshacer un pago = borrar ese gasto. El estado del mes se
  deriva del acumulado pagado vs `monto` (Pendiente/Parcial/Pagado). Vencimiento = campo `dia`
  (1-31) recurrente. Vigencia: mesInicio/mesFin (opcional); el GET ?month filtra a las vigentes y
  devuelve `paidByObligation` (monto pagado por obligacion). "Dar de baja" = poner mesFin
  (conserva historia); borrar = quitar de todos los meses.
- Usuario: completo (ver, editar).
- Gastos: completo (crear, listar, editar PATCH, borrar). La pestaña muestra solo gastos
  variables; los pagos de obligacion se gestionan desde la pestaña de Obligaciones.
- Ingresos: completo (crear, listar, editar PATCH, borrar). Tocar la fila abre editar.
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
- Doble conteo en Resumen: RESUELTO. El Resumen ya NO suma obligaciones; solo cuenta dinero
  real (ingresos + gastos). Cada gasto se clasifica por su propio `tipo` snapshot
  (variable / fijo / inversion), sin mirar la obligacion viva, asi que editar una obligacion no
  reclasifica pagos pasados. "Pendiente por pagar" = SALDO (monto - ya pagado) de las
  obligaciones del mes, separando gasto/inversion (soporta pagos parciales).
- Pagos parciales: HECHO. El estado no es booleano: se compara el acumulado pagado vs `monto`.
  El pago se hace desde la obligacion (POST /obligations/:id/pay), prellena el saldo y no permite
  sobrepago (si el recibo real sube, se edita el monto de la obligacion y luego se paga).

## Mejoras menores

- Reordenar obligaciones (backend ya soporta PATCH /obligations/reorder; falta UI con flechas).
- Boton "dar de baja este mes" en la obligacion (hoy se edita el campo mesFin a mano).
- Icono, splash y nombre visible de la app (branding IAAS).
- Pantalla de carga/errores mas pulida.
- Export muerto: `formatDate` en app/src/lib/format.ts ya no se usa (se puede borrar).

## Gaps de calidad

- No hay suite de tests versionada. Los flujos se probaron con scripts e2e ad-hoc; conviene
  dejar tests reales (ej. bun test) para: pago de obligacion (parcial, acumulado, guard de
  sobrepago y de vigencia), snapshot de `tipo`, vigencia, y calculo del resumen/KPIs.
- No hay CI (.github/workflows). Falta un workflow que corra `bun run typecheck` (+ tests) por push.
- Metric "Total/N" en la pantalla de Obligaciones: la lista se filtra por vigencia del mes,
  asi que ese conteo es por-mes, pero el limite gratis (MAX_FREE_OBLIGATIONS) es global. Revisar
  si el numero mostrado deberia ser el total global o el del mes.

## Endpoint de seed (desarrollo)

- POST /api/seed  (requiere auth) carga medios de pago + obligaciones por defecto en la
  cuenta actual. Idempotente (borra y recrea, no duplica).
- POST /api/seed?wipe=true  ademas borra gastos e ingresos del usuario.
- Se desactiva con ENABLE_DEV_SEED=false (ponlo asi en produccion).

## Notas tecnicas para continuar

- Monorepo Bun. Requiere `bunfig.toml` con `linker = "hoisted"` (si no, Metro/Babel fallan al resolver plugins).
- URL del backend en la app: variable EXPO_PUBLIC_API_URL en app/.env. En dispositivo fisico usar la IP LAN de la PC, no localhost. Reiniciar Expo con `bunx expo start -c` tras cambiarla.
- Backend local: `cd backend && JWT_SECRET=dev DATABASE_URL=mysql://root:root@localhost:3306/iaas bun run dev`
  (MySQL local: `docker run -d --name iaas-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=iaas -p 3306:3306 mysql:8`).
- App: `cd app && bunx expo start`.
- Deploy backend en Dokploy con el Dockerfile de la raiz. La base MySQL se crea aparte con el
  "database creator" de Dokploy (su propio volumen persistente) y se referencia con `DATABASE_URL`;
  asi el redeploy del API nunca toca los datos.
- Migraciones: `runMigrations()` corre al arrancar (backend/src/db/client.ts), asi que desplegar
  = reiniciar el contenedor y aplica lo pendiente.
- Integridad referencial: obligations.payment_method_id, expenses.payment_method_id y
  expenses.obligation_id son FK reales (convencion tabla_id) con ON DELETE SET NULL.
  NULL = "sin asignar" (ya no se usa "" para eso). El input Zod convierte ""/ausente -> null.
- Datos por defecto: constantes SEED_OBLIGATIONS y DEFAULT_PAYMENT_METHODS en packages/shared. Los inserta /api/seed (backend/src/lib/seed.ts), no el registro. DEFAULT_PAYMENT_METHODS usa una `key` interna (ef, cc1, dc1, pr1) solo para enlazar las obligaciones semilla a los ids generados; en la DB cada medio tiene su propio id. Los catalogos (monedas, categorias) son constantes en shared, no estan en la DB.
- Commits: estilo conventional, en ingles, breves, sin coautor. Push por cada paso.
