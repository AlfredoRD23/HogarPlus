import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { reportsController } from "./reports.controller";

export const reportsRouter = Router();

reportsRouter.use(authenticate, authorize("DIRECCION", "ADMINISTRACION"));
reportsRouter.get("/finance", asyncHandler((req, res) => reportsController.finance(req, res)));
