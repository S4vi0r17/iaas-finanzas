# Compilación y despliegue — Android / iOS

Todos los comandos van desde `app/` (`cd app` primero), salvo que se indique lo contrario.
Antes de cualquier build, revisa `app/.env` → `EXPO_PUBLIC_API_URL` debe apuntar al backend
correcto (local o producción), porque queda **horneado en el build**.

## 1. Desarrollo (Expo Go / dev client, sin compilar nada)

```bash
bun run start           # elige plataforma en el menú
bun run android         # abre directo en Android (emulador o Expo Go)
bun run ios             # abre directo en iOS (simulador o Expo Go)
bun run web             # versión web
```

Tras cambiar `.env`, reiniciar con caché limpio: `bunx expo start -c`.

## 2. Generar/actualizar la carpeta nativa

`android/` e `ios/` **no están en git** (proyecto managed). Hay que generarlas antes de
cualquier build local, y regenerarlas si cambias `app.json`, íconos, plugins, o agregás una
librería nativa nueva.

```bash
bun run prebuild         # genera android/ (y ios/ si estás en Mac)
bun run prebuild:clean   # borra y regenera desde cero (si algo quedó inconsistente)
```

## 3. Build local (compila en tu máquina, sin EAS)

Requiere Android Studio/SDK (Android) o Xcode (iOS, solo Mac).

```bash
bun run run:android      # compila + instala en emulador/dispositivo conectado
bun run run:ios          # ídem, solo funciona en macOS
```

### Solo generar el archivo (APK), sin instalar automáticamente

```bash
cd android && ./gradlew assembleDebug
```

APK resultante: `app/android/app/build/outputs/apk/debug/app-debug.apk`

Instalar manualmente:
- USB + depuración habilitada: `adb install app-debug.apk`
- O copiar el `.apk` al celular y abrirlo (permitir "orígenes desconocidos").

> Esto es un build **debug** (firmado con el keystore de debug de Android). Sirve para probar,
> no para publicar en Play Store — para eso ver la sección 4.

iOS no tiene equivalente de "solo generar el archivo" simple sin Xcode/firma; en Mac,
`bun run run:ios` es el camino local.

## 4. Build en la nube (EAS) — para builds firmados / publicar en stores

Requiere cuenta de Expo y configuración una sola vez:

```bash
npx eas login              # una vez
npx eas build:configure    # una vez, genera eas.json
```

Luego:

```bash
bun run build:android    # = eas build --platform android
bun run build:ios        # = eas build --platform ios
```

Sube el proyecto a los servidores de Expo, compila ahí (no usa tu máquina) y te da un link de
descarga del `.apk`/`.aab` (Android) o `.ipa` (iOS), firmado y listo para distribuir o subir a
la store.

## 5. Publicar en las stores

```bash
bun run submit:android   # = eas submit --platform android  (sube a Play Store)
bun run submit:ios       # = eas submit --platform ios      (sube a App Store)
```

Requiere haber hecho `build:android`/`build:ios` antes, y tener cuenta de desarrollador
configurada (Google Play Console / Apple Developer) enlazada en `eas.json`.

## Resumen rápido

| Quiero...                                   | Comando                          |
|----------------------------------------------|----------------------------------|
| Probar cambios rápido, sin compilar           | `bun run start` / `android` / `ios` |
| Regenerar carpeta nativa                      | `bun run prebuild`               |
| APK de prueba, instalado ya en mi celular      | `bun run run:android`            |
| Solo el archivo `.apk` de prueba              | `cd android && ./gradlew assembleDebug` |
| Build firmado para publicar (Android/iOS)     | `bun run build:android` / `build:ios` |
| Subir a Play Store / App Store                | `bun run submit:android` / `submit:ios` |
