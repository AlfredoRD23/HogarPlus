import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { inventoryController } from "./inventory.controller";

export const inventoryRouter = Router();

inventoryRouter.use(authenticate);
inventoryRouter.get("/", asyncHandler((req, res) => inventoryController.list(req, res)));
inventoryRouter.post(
  "/",
  authorize("INVENTARIO", "ADMINISTRACION"),
  asyncHandler((req, res) => inventoryController.move(req, res)),
);
