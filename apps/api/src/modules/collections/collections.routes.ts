import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { collectionsController } from "./collections.controller";

export const collectionsRouter = Router();

collectionsRouter.use(authenticate, authorize("ADMINISTRACION"));
collectionsRouter.get("/", asyncHandler((req, res) => collectionsController.board(req, res)));
collectionsRouter.post("/notes", asyncHandler((req, res) => collectionsController.addNote(req, res)));
