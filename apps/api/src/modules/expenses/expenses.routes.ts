import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { expensesController } from "./expenses.controller";

export const expensesRouter = Router();

expensesRouter.use(authenticate, authorize("ADMINISTRACION", "DIRECCION"));
expensesRouter.get("/", asyncHandler((req, res) => expensesController.list(req, res)));
expensesRouter.post("/", asyncHandler((req, res) => expensesController.create(req, res)));
expensesRouter.patch("/:id", asyncHandler((req, res) => expensesController.update(req, res)));
expensesRouter.post("/:id/void", asyncHandler((req, res) => expensesController.voidExpense(req, res)));
