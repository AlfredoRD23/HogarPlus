import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { paymentsController } from "./payments.controller";

export const paymentsRouter = Router();

paymentsRouter.use(authenticate, authorize("VENTAS", "COBRANZA"));
paymentsRouter.get("/", asyncHandler((req, res) => paymentsController.list(req, res)));
paymentsRouter.get("/:id", asyncHandler((req, res) => paymentsController.get(req, res)));
paymentsRouter.post(
  "/",
  asyncHandler((req, res) => paymentsController.create(req, res)),
);
paymentsRouter.post(
  "/:id/void",
  authorize("ADMINISTRACION"),
  asyncHandler((req, res) => paymentsController.voidPayment(req, res)),
);
