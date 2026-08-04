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

### Fase 2 - Notificaciones nativas - HECHO (base)
- Integrado expo-notifications (~55.0.25). Notificaciones LOCALES unicamente
  (Notifications.scheduleNotificationAsync), no push remoto. No requiere cuenta de Expo ni EAS
  project id, solo permiso en el dispositivo y (Android) un canal ("obligaciones"). Si en el
  futuro se necesita push remoto (avisar con la app cerrada, disparado desde el servidor) ahi
  si hara falta EAS project + Expo push token.
- app/src/lib/notifications.ts: setNotificationHandler, ensureNotificationSetup (permiso +
  canal Android) y scheduleObligationReminders (recalcula y reprograma TODO desde cero: cancela
  lo programado y vuelve a crear, asi no hay que llevar estado de que ya se aviso). Por
  obligacion impaga del mes real (no el mes que este navegando el usuario en la UI):
  - Proximo (3 dias antes, 9am, trigger DATE) si esa fecha no paso.
  - Vence hoy (dia de vencimiento, 9am, trigger DATE) si esa fecha no paso.
  - Retrasado (si ya vencio y sigue impaga): trigger DAILY a las 9am, se repite solo hasta que
    se pague (al pagar deja de estar en la lista de impagas y no se recrea).
- app/src/hooks/useObligationReminders.ts: hook que pide permiso una vez al montar y reprograma
  cada vez que cambian los datos de obligaciones del mes real (useObligations + monthKeyOf).
- Conectado en app/src/app/(tabs)/_layout.tsx via un componente <ObligationReminders /> sin UI,
  montado DENTRO del gate de auth (despues del `if (!user) return <Redirect ...>`) para no
  disparar el fetch de obligaciones antes de tener token.
- Pendiente opcional: toggle en Ajustes para activar/desactivar recordatorios (hoy se pide
  permiso automatico al entrar a la app logueado, sin UI para desactivarlo desde la app).

### Fase 3 - WhatsApp - HECHO
- DECISION: recordatorios 100% automaticos por WhatsApp (obligaciones por vencer, pagos, etc.),
  SIN envio manual (nada de Linking/wa.me) y SIN que el usuario tenga que activar nada de su
  lado (ni opt-in, ni apikey). El usuario solo carga su numero en Ajustes.
- Se probo primero con CallMeBot (API HTTP gratuita) pero se descarto: su API gratuita solo deja
  mandarle mensajes al MISMO numero que hizo el opt-in -> no se puede mandar desde una cuenta a
  numeros de terceros. Eso obligaba a que cada usuario se activara a mano contra el bot de
  CallMeBot, lo cual no cumplia el objetivo (usuarios que no configuran nada). Es una limitacion
  estructural de la API, no solo friccion de UX.
- Libreria elegida: whatsapp-web.js (v1.34.7) + qrcode-terminal. Una sola cuenta de WhatsApp del
  NEGOCIO (se escanea un QR una vez) le manda el digest directo a cada usuario usando solo su
  numero de telefono. Riesgos asumidos explicitamente por decision del usuario:
  - Automatizacion no oficial de WhatsApp Web -> riesgo real de ban de la cuenta. Si pasa, se
    cae el envio para TODOS los usuarios a la vez (a diferencia de CallMeBot, donde solo se
    afectaba a un usuario).
  - Sesion persistida en disco (LocalAuth) — si se pierde (redeploy sin volumen persistente,
    WhatsApp cierra la sesion, etc.) hay que volver a escanear un QR a mano viendo los logs del
    contenedor (backend/src/lib/whatsapp.ts loguea el QR en ASCII con qrcode-terminal al evento
    'qr'; se ve con `docker logs` o el visor de logs de Dokploy).
- IMPORTANTE - requiere volumen persistente en produccion: hay que configurar en Dokploy un
  volumen montado en /app/backend/.wwebjs_auth para la Application del backend (ademas del
  volumen de MySQL que ya existe). Sin esto, cada redeploy borra la sesion y el envio se corta
  hasta volver a escanear el QR a mano. compose.yaml ya tiene el volumen equivalente para dev
  local (iaas_wa_session); Dokploy hay que configurarlo aparte, es un paso manual fuera del repo.
- Docker: el Chromium que descarga Puppeteer por defecto es glibc y NO corre en Alpine (musl).
  El Dockerfile instala el paquete `chromium` nativo de Alpine (`apk add chromium nss freetype
  harfbuzz ca-certificates ttf-freefont`) y apunta Puppeteer ahi con PUPPETEER_EXECUTABLE_PATH=
  /usr/bin/chromium-browser + PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true (saltea su propia descarga).
  Verificado con `docker build` real: el binario queda en /usr/bin/chromium-browser (symlink) y
  arranca headless con --no-sandbox --disable-setuid-sandbox --disable-gpu (sin --disable-gpu
  tira errores de Vulkan/ANGLE en el contenedor sin GPU, aunque no impiden el envio; se dejo el
  flag para evitar el ruido). En dev local (`bun run dev`, fuera de Docker) no hace falta nada
  de esto: Puppeteer descarga su propio Chromium normal en el `bun install` de la raiz.
- BUG encontrado y arreglado en produccion (Dokploy): si el contenedor se mata de golpe
  (redeploy, OOM) sin que Chromium se cierre limpio, el perfil de LocalAuth queda con un lock
  (SingletonLock/SingletonSocket/SingletonCookie, symlinks) que bloquea el siguiente arranque
  con "Failed to launch the browser process: ... profile appears to be in use by another
  Chromium process (PID) on another computer", aunque ese proceso ya no exista. Se soluciono en
  backend/src/lib/whatsapp.ts con dos cosas: (1) clearStaleChromeLock() borra esos lock files
  antes de iniciar el cliente en cada boot (rmSync con force, no falla si no existen), y (2) un
  handler de SIGTERM/SIGINT que llama client.destroy() para que Chromium cierre prolijo cuando
  Docker para el contenedor (redeploy normal), evitando que el lock quede huerfano en primer
  lugar. Reproducido y verificado en local: se mato el proceso con -9 completo (bun + todo el
  arbol de Chromium) para simular el kill duro de un redeploy, y el siguiente arranque booteo
  limpio en vez de crashear. Confirmado tambien en Dokploy por el usuario: redeploy sin crash y
  la sesion siguio autenticada (el volumen persistente ya esta funcionando bien).
- backend/src/lib/whatsappTest.ts (`bun run wa:test <telefono>` desde backend/): script manual
  para mandar un mensaje de prueba sin depender de que haya obligaciones pendientes ni esperar
  al horario del digest diario. Espera hasta ~60s a que el cliente autentique y confirma si el
  envio funciono.
- Sin gate de Plan PRO por ahora (libre para todos los usuarios). El unico uso real de `isPro`
  en el backend sigue siendo el limite de obligaciones gratis en obligations.ts; no hay flujo de
  upgrade/pago, asi que no se gateo esto todavia.
- Disparador: timer interno (`setInterval`) dentro del propio proceso Bun del backend
  (backend/src/lib/whatsappScheduler.ts), arrancado desde index.ts tras runMigrations(). No hay
  cron externo: el backend corre siempre encendido en Docker (Dokploy/compose), no serverless.
  Chequea cada 5 min (CHECK_INTERVAL_MS); envia una sola vez por dia calendario, pasada la hora
  SEND_HOUR (default 8, configurable con env var WHATSAPP_DIGEST_HOUR). El "ya se envio hoy" se
  guarda en una variable en memoria (lastSentDate) -> se resetea en cada redeploy; peor caso, un
  digest duplicado o saltado el dia del redeploy. Aceptable para el alcance actual, no amerita
  tabla nueva. Pacing de 4s entre envios a distintos usuarios (cortesia para no parecer spam).
- Contenido: un solo digest diario por usuario (no un mensaje por obligacion), agrupado en
  Atrasadas / Vencen hoy / Proximas (mismos 3 dias que la ventana de notificaciones locales de
  Fase 2, via dueDate ahora compartido). Si el usuario no tiene nada pendiente ese dia, no se le
  manda nada (evita ruido diario). Solo se les manda a usuarios con waPhone no vacio.
- Modelo de datos: la columna waKey (necesaria solo para CallMeBot) se elimino de punta a punta
  (backend/src/db/schema.ts, packages/shared/src/schemas.ts, backend/src/routes/auth.ts,
  migracion backend/drizzle/0001_sad_ultragirl.sql) — era segura de borrar porque se agrego en
  esta misma sesion y nunca llego a produccion. waPhone se mantiene igual.
- dueDate() se movio de app/src/lib/obligationStatus.ts a packages/shared/src/date.ts (matematica
  de fechas pura, sin dependencias de React Native) para que el backend pudiera reusarla sin
  duplicar la logica de vencimiento. obligationStatus.ts ahora re-exporta desde @iaas/shared.
- Probado extremo a extremo en local contra MySQL real: `docker build` real de la imagen
  (Chromium de Alpine arranca bien), y backend corriendo con `bun run dev` + WHATSAPP_DIGEST_HOUR=0
  confirmo que el cliente de whatsapp-web.js arranca, genera el QR en ASCII en los logs, y que el
  scheduler maneja con gracia el caso "cliente todavia no listo" (no crashea, solo loguea y
  reintenta el proximo dia). Confirmado en produccion con un numero real: mensaje de prueba y
  digest automatico llegaron OK.
- Boton "Enviar mensaje de prueba" en Ajustes (POST /api/me/whatsapp-test, backend/src/routes/
  user.ts): manda al numero que este escrito en el campo (no hace falta guardarlo antes),
  reusa el mismo cliente de WhatsApp ya corriendo en el proceso (no levanta uno nuevo, evita
  conflicto de lock con el cliente principal), cooldown de 60s por usuario para evitar spam.
  Utils: app/src/hooks/queries.ts (useSendWhatsappTest), backend/src/lib/whatsappTest.ts
  (`bun run wa:test <telefono>`, script de linea de comandos equivalente pero standalone —
  NO correrlo mientras el proceso principal esta vivo, compiten por el mismo lock de Chromium).
- Cadencia de "atrasado" ajustada: antes avisaba TODOS los dias (push local y WhatsApp), ahora
  cada 3 dias (ATRASADO_CADA_DIAS) mientras siga sin pagar. En push local se cambio el trigger
  de DAILY a TIME_INTERVAL (seconds: 3*86400, repeats:true). En WhatsApp se agrego un cooldown
  en memoria por obligacion (lastAtrasadoNotifiedAt en whatsappScheduler.ts) que omite la
  obligacion del digest de ese dia si ya se aviso hace menos de 3 dias (aunque siga atrasada).
  Los mensajes de "atrasada" y "proxima" ahora incluyen la fecha concreta de vencimiento
  (antes solo decian la categoria, sin fecha).
- BUG encontrado y resuelto en Dokploy (persistencia de sesion, iteracion 2): con un "Volume
  Mount" (nombre wa-session, path /app/backend/.wwebjs_auth) la sesion se perdio igual despues
  de un "Deploy" normal (sin tocar la config del mount) — causa exacta sin confirmar, sospecha
  de que Dokploy recrea el volumen con nombre internamente en un deploy completo aunque la UI
  muestre el mismo nombre. Se probo pasar a Bind Mount a un path del host (/opt/iaas-wa-session)
  pero **tumbo el contenedor entero** ("No such container"): el "Open Terminal" de Dokploy abre
  una shell DENTRO del contenedor, no del servidor host, asi que la carpeta creada con mkdir
  nunca existio de verdad en el host, y Docker se niega a arrancar un contenedor cuyo Bind Mount
  apunta a un path inexistente en el host. Se recupero borrando el mount y redeployando. Sigue
  PENDIENTE encontrar una terminal real al servidor (buscar seccion "Servers"/infra en Dokploy
  fuera de esta Application) antes de reintentar un Bind Mount. Mientras tanto, sin volumen
  persistente: cada redeploy pide re-escanear el QR (molesto pero no rompe nada).

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
