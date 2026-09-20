import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { clientsController } from "./clients.controller";
import { asUploadError, clientImageUpload } from "../../lib/upload";
import { referralsController } from "../referrals/referrals.controller";

export const clientsRouter = Router();

clientsRouter.use(authenticate);
clientsRouter.get("/", authorize("VENTAS", "COBRANZA"), asyncHandler((req, res) => clientsController.list(req, res)));
clientsRouter.get("/:id", authorize("VENTAS", "COBRANZA"), asyncHandler((req, res) => clientsController.get(req, res)));
clientsRouter.post(
  "/",
  authorize("VENTAS"),
  asyncHandler((req, res) => clientsController.create(req, res)),
);
clientsRouter.patch(
  "/:id",
  authorize("VENTAS"),
  asyncHandler((req, res) => clientsController.update(req, res)),
);
clientsRouter.post(
  "/:id/affiliation",
  authorize("VENTAS"),
  asyncHandler((req, res) => clientsController.payAffiliation(req, res)),
);
clientsRouter.post(
  "/:id/images",
  authorize("VENTAS"),
  (req, res, next) => {
    clientImageUpload.array("images", 8)(req, res, (error) => {
      if (error) {
        next(asUploadError(error));
        return;
      }
      next();
    });
  },
  asyncHandler((req, res) => clientsController.addImages(req, res)),
);
clientsRouter.delete(
  "/:id/images/:imageId",
  authorize("VENTAS"),
  asyncHandler((req, res) => clientsController.removeImage(req, res)),
);
clientsRouter.get(
  "/:id/referrals",
  authorize("VENTAS"),
  asyncHandler((req, res) => referralsController.list(req, res)),
);
clientsRouter.post(
  "/:id/referrals",
  authorize("VENTAS"),
  asyncHandler((req, res) => referralsController.create(req, res)),
);
