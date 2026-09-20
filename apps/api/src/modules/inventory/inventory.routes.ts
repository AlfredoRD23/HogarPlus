import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { inventoryController } from "./inventory.controller";

export const inventoryRouter = Router();

inventoryRouter.use(authenticate, authorize("INVENTARIO"));
inventoryRouter.get("/", asyncHandler((req, res) => inventoryController.list(req, res)));
inventoryRouter.post(
  "/",
  asyncHandler((req, res) => inventoryController.move(req, res)),
);
