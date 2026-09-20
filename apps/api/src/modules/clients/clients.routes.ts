import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { clientsController } from "./clients.controller";

export const clientsRouter = Router();

clientsRouter.use(authenticate);
clientsRouter.get("/", asyncHandler((req, res) => clientsController.list(req, res)));
clientsRouter.get("/:id", asyncHandler((req, res) => clientsController.get(req, res)));
clientsRouter.post(
  "/",
  authorize("VENTAS", "ADMINISTRACION", "DIRECCION"),
  asyncHandler((req, res) => clientsController.create(req, res)),
);
clientsRouter.patch(
  "/:id",
  authorize("VENTAS", "ADMINISTRACION", "DIRECCION"),
  asyncHandler((req, res) => clientsController.update(req, res)),
);
clientsRouter.post(
  "/:id/affiliation",
  authorize("VENTAS", "COBRANZA", "ADMINISTRACION", "DIRECCION"),
  asyncHandler((req, res) => clientsController.payAffiliation(req, res)),
);
