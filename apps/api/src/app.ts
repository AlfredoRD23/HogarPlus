import { Prisma } from "@prisma/client";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { config } from "./config/env";
import { errorHandler, notFound } from "./shared/http";
import { authRouter } from "./modules/auth/auth.routes";
import { usersRouter } from "./modules/users/users.routes";
import { clientsRouter } from "./modules/clients/clients.routes";
import { productsRouter } from "./modules/products/products.routes";
import { inventoryRouter } from "./modules/inventory/inventory.routes";
import { creditsRouter } from "./modules/credits/credits.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { collectionsRouter } from "./modules/collections/collections.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { expensesRouter } from "./modules/expenses/expenses.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { portalRouter } from "./modules/portal/portal.routes";
import { searchRouter } from "./modules/search/search.routes";

fs.mkdirSync(config.uploadDir, { recursive: true });

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.set("json replacer", (_key: string, value: unknown) => {
    if (value instanceof Prisma.Decimal) return value.toNumber();
    return value;
  });
  app.use(morgan("dev"));
  app.use("/uploads", express.static(path.resolve(config.uploadDir)));

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok", service: "hogarplus-api" } });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/credits", creditsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/collections", collectionsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/expenses", expensesRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/portal", portalRouter);
  app.use("/api/search", searchRouter);

  const webDist = [
    path.resolve(process.cwd(), "apps/web/dist"),
    path.resolve(process.cwd(), "apps/api/public"),
    path.resolve(__dirname, "../../../web/dist"),
    path.resolve(__dirname, "../../public"),
  ].find((dir) => fs.existsSync(path.join(dir, "index.html")));

  if (webDist) {
    console.log(`HogarPlus sirviendo panel desde ${webDist}`);
    app.use(express.static(webDist));
    app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res, next) => {
      res.sendFile(path.join(webDist, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  } else {
    console.warn("HogarPlus no encontró apps/web/dist; la raíz seguirá en JSON 404");
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
