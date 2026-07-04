# Compilación y despliegue — Android / iOS

Todos los comandos van desde `app/` (`cd app` primero), salvo que se indique lo contrario.
Antes de cualquier build, revisa `app/.env` → `EXPO_PUBLIC_API_URL` debe apuntar al backend
correcto (local o producción), porque queda **horneado en el build**.

## 1. Generar/actualizar la carpeta nativa

`android/` e `ios/` **no están en git**. Hay que generarlas antes de cualquier build, y
regenerarlas si cambias `app.json`, íconos, plugins, o agregás una librería nativa nueva.

```bash
bun run prebuild         # genera android/ (y ios/ si estás en Mac)
bun run prebuild:clean   # borra y regenera desde cero (si algo quedó inconsistente)
```

## 2. Build local standalone (compila en tu máquina, sin EAS)

Genera un APK/app con el JS ya empaquetado adentro — se instala y funciona solo, sin nada
corriendo en tu PC.

```bash
bun run run:android      # compila + instala en emulador/dispositivo conectado
bun run run:ios          # ídem, solo funciona en macOS
```

### Solo generar el archivo, sin instalar automáticamente

```bash
cd android && ./gradlew assembleRelease
```

APK resultante: `app/android/app/build/outputs/apk/release/app-release.apk`

Instalar manualmente:
- USB + depuración habilitada: `adb install app-release.apk`
- O copiar el `.apk` al celular y abrirlo (permitir "orígenes desconocidos").

Este build ya viene firmado (keystore de debug de Android, suficiente para pruebas locales).
**No sirve para subir a Play Store** — para eso, ver la sección 4.

## 3. Build en la nube (EAS) — para builds firmados / publicar en stores

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
descarga del `.apk`/`.aab` (Android) o `.ipa` (iOS), firmado con un keystore de producción real
y listo para distribuir o subir a la store.

## 4. Publicar en las stores

```bash
bun run submit:android   # = eas submit --platform android  (sube a Play Store)
bun run submit:ios       # = eas submit --platform ios      (sube a App Store)
```

Requiere haber hecho `build:android`/`build:ios` antes, y tener cuenta de desarrollador
configurada (Google Play Console / Apple Developer) enlazada en `eas.json`.

## Resumen rápido

| Quiero...                                   | Comando                          |
|----------------------------------------------|----------------------------------|
| Regenerar carpeta nativa                      | `bun run prebuild`               |
| APK standalone, instalado ya en mi celular    | `bun run run:android`            |
| Solo el archivo `.apk` standalone             | `cd android && ./gradlew assembleRelease` |
| Build firmado para publicar (Android/iOS)     | `bun run build:android` / `build:ios` |
| Subir a Play Store / App Store                | `bun run submit:android` / `submit:ios` |
