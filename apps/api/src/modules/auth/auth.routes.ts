import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { authController } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", asyncHandler((req, res) => authController.login(req, res)));
authRouter.get("/me", authenticate, asyncHandler((req, res) => authController.me(req, res)));
