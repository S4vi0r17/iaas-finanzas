# ── IAAS Finanzas · Backend (Bun + Hono + SQLite) ──
# Contexto de build = raíz del monorepo (por el workspace @iaas/shared).
FROM oven/bun:1.3-alpine

WORKDIR /app

# 1) Instalar dependencias con caché (solo manifests primero)
COPY package.json bun.lock bunfig.toml ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY app/package.json app/
RUN bun install --frozen-lockfile

# 2) Copiar el código
COPY packages ./packages
COPY backend ./backend

# 3) Datos persistentes (montar volumen aquí en Dokploy)
ENV NODE_ENV=production
ENV DB_PATH=/app/data/iaas.sqlite
ENV PORT=3000
RUN mkdir -p /app/data
VOLUME ["/app/data"]

WORKDIR /app/backend
EXPOSE 3000

# Las migraciones se aplican solas al arrancar (runMigrations en index.ts)
CMD ["bun", "run", "src/index.ts"]
