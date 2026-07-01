import { sign, verify } from "hono/jwt";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-insecure-secret-change-me";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

if (process.env.NODE_ENV === "production" && JWT_SECRET === "dev-insecure-secret-change-me") {
  throw new Error("JWT_SECRET no configurado en producción");
}

export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export function signToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, iat: now, exp: now + TOKEN_TTL_SECONDS }, JWT_SECRET, "HS256");
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
