import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { referralsController } from "./referrals.controller";

export const referralsRouter = Router();

referralsRouter.use(authenticate);
referralsRouter.get(
  "/match",
  authorize("VENTAS", "COBRANZA", "ADMINISTRACION", "DIRECCION"),
  asyncHandler((req, res) => referralsController.match(req, res)),
);
