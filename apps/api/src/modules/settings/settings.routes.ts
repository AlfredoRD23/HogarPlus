import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { settingsController } from "./settings.controller";

export const settingsRouter = Router();

settingsRouter.use(authenticate);
settingsRouter.get("/", asyncHandler((req, res) => settingsController.get(req, res)));
settingsRouter.put(
  "/",
  authorize("TECNOLOGIA"),
  asyncHandler((req, res) => settingsController.update(req, res)),
);
