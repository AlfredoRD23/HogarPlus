import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { productsController } from "./products.controller";

export const productsRouter = Router();

productsRouter.use(authenticate);
productsRouter.get("/", asyncHandler((req, res) => productsController.list(req, res)));
productsRouter.get("/:id", asyncHandler((req, res) => productsController.get(req, res)));
productsRouter.post(
  "/",
  authorize("INVENTARIO", "ADMINISTRACION"),
  asyncHandler((req, res) => productsController.create(req, res)),
);
productsRouter.patch(
  "/:id",
  authorize("INVENTARIO", "ADMINISTRACION"),
  asyncHandler((req, res) => productsController.update(req, res)),
);
