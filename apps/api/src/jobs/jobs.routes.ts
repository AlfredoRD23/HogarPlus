import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { config } from "../config/env";
import { asyncHandler } from "../shared/http";
import { AppError } from "../shared/utils";
import { applySla, getLastSlaRun } from "../shared/sla";

export const jobsRouter = Router();

function cronGuard(req: Request, _res: Response, next: NextFunction) {
  if (!config.cronSecret) {
    next(new AppError(401, "UNAUTHENTICATED", "Configura CRON_SECRET para ejecutar el job"));
    return;
  }
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : String(req.headers["x-cron-secret"] ?? "");
  if (token !== config.cronSecret) {
    next(new AppError(401, "UNAUTHENTICATED", "Secreto de cron inválido"));
    return;
  }
  next();
}

jobsRouter.post(
  "/sla",
  cronGuard,
  asyncHandler(async (_req, res) => {
    const data = await applySla();
    res.json({ success: true, data });
  }),
);

jobsRouter.get(
  "/sla",
  cronGuard,
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: getLastSlaRun() });
  }),
);
