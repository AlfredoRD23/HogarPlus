import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { creditsController } from "./credits.controller";

export const creditsRouter = Router();

creditsRouter.use(authenticate);
creditsRouter.get("/", asyncHandler((req, res) => creditsController.list(req, res)));
creditsRouter.get("/:id", asyncHandler((req, res) => creditsController.get(req, res)));
creditsRouter.post(
  "/",
  authorize("VENTAS", "ADMINISTRACION"),
  asyncHandler((req, res) => creditsController.create(req, res)),
);
creditsRouter.patch(
  "/:id",
  authorize("VENTAS", "ADMINISTRACION"),
  asyncHandler((req, res) => creditsController.update(req, res)),
);
