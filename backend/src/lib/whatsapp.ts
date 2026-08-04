import { rmSync } from "node:fs";
import path from "node:path";
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH ?? "./.wwebjs_auth";

let client: Client | null = null;
let ready = false;

/**
 * Si el proceso anterior se mató de golpe (redeploy, OOM) sin apagar
 * Chromium limpio, queda un lock en el perfil que bloquea el próximo
 * arranque aunque ese proceso ya no exista. Se borra antes de iniciar; es
 * seguro porque en ese punto todavía no arrancamos ningún Chromium nuevo.
 */
function clearStaleChromeLock(): void {
  const profileDir = path.join(SESSION_PATH, "session");
  for (const file of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    try {
      rmSync(path.join(profileDir, file), { force: true });
    } catch (err) {
      console.error(`[whatsapp] No se pudo limpiar el lock ${file}:`, err);
    }
  }
}

/**
 * Arranca la sesión de WhatsApp del negocio. Loguea un QR ASCII la primera
 * vez (o si la sesión se pierde) — hay que escanearlo a mano viendo los logs
 * del contenedor. La sesión se persiste en WHATSAPP_SESSION_PATH (LocalAuth).
 */
export function startWhatsappClient(): void {
  clearStaleChromeLock();

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    },
  });

  client.on("qr", (qr) => {
    console.log("[whatsapp] Escaneá este QR con el WhatsApp del negocio:");
    qrcode.generate(qr, { small: true });
  });
  client.on("ready", () => {
    ready = true;
    console.log("[whatsapp] Cliente de WhatsApp listo.");
  });
  client.on("auth_failure", (msg) => console.error("[whatsapp] Fallo de autenticación:", msg));
  client.on("disconnected", (reason) => {
    ready = false;
    console.error("[whatsapp] Cliente desconectado:", reason);
  });

  client.initialize().catch((err) => console.error("[whatsapp] Error al iniciar el cliente:", err));

  // Apagado prolijo: si Docker manda SIGTERM (redeploy, `docker stop`), cerrar
  // Chromium a través de la librería para que libere su propio lock, en vez
  // de que lo mate de golpe y deje el perfil bloqueado para el próximo boot.
  const shutdown = async () => {
    await client?.destroy().catch(() => {});
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

function toChatId(phone: string): string {
  return `${phone.replace(/\D/g, "")}@c.us`;
}

/**
 * Manda un mensaje de texto. Si el cliente no está listo (sesión no
 * escaneada o caída), no lanza: devuelve false y loguea.
 */
export async function sendWhatsApp(phone: string, text: string): Promise<boolean> {
  if (!client || !ready) {
    console.error(`[whatsapp] Cliente no listo, se omite envío a ${phone}`);
    return false;
  }
  try {
    await client.sendMessage(toChatId(phone), text);
    return true;
  } catch (err) {
    console.error(`[whatsapp] Error enviando a ${phone}:`, err);
    return false;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
