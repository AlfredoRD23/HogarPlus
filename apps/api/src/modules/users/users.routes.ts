import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { usersController } from "./users.controller";

export const usersRouter = Router();

usersRouter.use(authenticate, authorize("DIRECCION", "TECNOLOGIA", "ADMINISTRACION"));
usersRouter.get("/", asyncHandler((req, res) => usersController.list(req, res)));
usersRouter.post("/", asyncHandler((req, res) => usersController.create(req, res)));
usersRouter.patch("/:id", asyncHandler((req, res) => usersController.update(req, res)));
