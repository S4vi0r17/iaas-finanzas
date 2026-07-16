import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ZodError } from "zod";
import { runMigrations } from "./db/client";
import { authRoutes } from "./routes/auth";
import { categoryRoutes } from "./routes/categories";
import { expenseRoutes } from "./routes/expenses";
import { incomeRoutes } from "./routes/incomes";
import { obligationRoutes } from "./routes/obligations";
import { paymentMethodRoutes } from "./routes/paymentMethods";
import { seedRoutes } from "./routes/seed";
import { userRoutes } from "./routes/user";
import { requireAuth, type AuthEnv } from "./middleware/auth";

runMigrations();

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true, service: "iaas-finanzas" }));

// Rutas públicas
app.route("/api/auth", authRoutes);

// Rutas protegidas (requieren JWT)
const api = new Hono<AuthEnv>();
api.use("*", requireAuth);
api.route("/", userRoutes);
api.route("/payment-methods", paymentMethodRoutes);
api.route("/categories", categoryRoutes);
api.route("/obligations", obligationRoutes);
api.route("/expenses", expenseRoutes);
api.route("/incomes", incomeRoutes);
api.route("/seed", seedRoutes);
app.route("/api", api);

// Manejo de errores (validación Zod → 400)
app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: "Datos inválidos", issues: err.flatten().fieldErrors }, 400);
  }
  console.error(err);
  return c.json({ error: "Error interno del servidor" }, 500);
});

const port = Number(process.env.PORT ?? 3000);
console.log(`IAAS Finanzas API escuchando en http://localhost:${port}`);

export default { port, fetch: app.fetch };
