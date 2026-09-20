import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { dashboardController } from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, authorize("ADMINISTRACION"));
dashboardRouter.get("/", asyncHandler((req, res) => dashboardController.summary(req, res)));
