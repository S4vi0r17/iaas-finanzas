import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

let client: Client | null = null;
let ready = false;

/**
 * Arranca la sesión de WhatsApp del negocio. Loguea un QR ASCII la primera
 * vez (o si la sesión se pierde) — hay que escanearlo a mano viendo los logs
 * del contenedor. La sesión se persiste en WHATSAPP_SESSION_PATH (LocalAuth).
 */
export function startWhatsappClient(): void {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: process.env.WHATSAPP_SESSION_PATH ?? "./.wwebjs_auth",
    }),
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
