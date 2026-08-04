// Manda un mensaje de prueba para confirmar que la sesión de WhatsApp
// funciona: bun run wa:test +51987654321
import { sendWhatsApp, sleep, startWhatsappClient } from "./whatsapp";

const phone = process.argv[2];
if (!phone) {
  console.error("Uso: bun run wa:test <telefono con codigo de pais, ej. +51987654321>");
  process.exit(1);
}

startWhatsappClient();

const MAX_TRIES = 30; // ~60s dando tiempo a que la sesión autentique
for (let i = 0; i < MAX_TRIES; i++) {
  await sleep(2000);
  const ok = await sendWhatsApp(
    phone,
    "✅ Prueba de IAAS Finanzas — si ves esto, el envío automático funciona.",
  );
  if (ok) {
    console.log("Mensaje enviado ✓");
    process.exit(0);
  }
}
console.error(`No se pudo enviar tras ${(MAX_TRIES * 2000) / 1000}s (¿sesión no autenticada?).`);
process.exit(1);
