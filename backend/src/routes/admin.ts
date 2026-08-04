import { Hono } from "hono";
import QRCode from "qrcode";
import { getWhatsappStatus } from "../lib/whatsapp";

export const adminRoutes = new Hono();

/**
 * Página de diagnóstico para escanear el QR de WhatsApp sin depender de los
 * logs del contenedor. Protegida por una clave simple en query string (no es
 * un usuario de la app, es una herramienta de operación del negocio).
 * Requiere ADMIN_QR_KEY configurada; sin eso, la ruta queda deshabilitada.
 */
adminRoutes.get("/whatsapp-qr", async (c) => {
  const expected = process.env.ADMIN_QR_KEY;
  if (!expected) {
    return c.text("ADMIN_QR_KEY no está configurada en el servidor.", 503);
  }
  if (c.req.query("key") !== expected) {
    return c.text("No autorizado.", 401);
  }

  const { ready, qr } = getWhatsappStatus();

  let body: string;
  if (ready) {
    body = `<p class="ok">✅ WhatsApp conectado y funcionando.</p>`;
  } else if (qr) {
    const dataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 1 });
    body = `
      <img src="${dataUrl}" alt="QR de WhatsApp" width="320" height="320" />
      <p>Abrí WhatsApp en el celular del negocio → Dispositivos vinculados →
      Vincular un dispositivo, y apuntá la cámara acá.</p>
      <p class="hint">Esta página se actualiza sola cada 5 segundos.</p>
    `;
  } else {
    body = `<p>Esperando a que el cliente arranque...</p>`;
  }

  return c.html(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${ready ? "" : `<meta http-equiv="refresh" content="5" />`}
  <title>WhatsApp - IAAS Finanzas</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
      gap: 12px;
    }
    img { border-radius: 12px; background: #fff; padding: 12px; }
    .ok { font-size: 1.5rem; color: #4ade80; }
    .hint { font-size: 0.85rem; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>📲 WhatsApp del negocio</h1>
  ${body}
</body>
</html>`);
});
