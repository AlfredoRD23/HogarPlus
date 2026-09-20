import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { productsController } from "./products.controller";
import { asUploadError, productImageUpload } from "../../lib/upload";

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
productsRouter.post(
  "/:id/images",
  authorize("INVENTARIO", "ADMINISTRACION"),
  (req, res, next) => {
    productImageUpload.array("images", 6)(req, res, (error) => {
      if (error) {
        next(asUploadError(error));
        return;
      }
      next();
    });
  },
  asyncHandler((req, res) => productsController.addImages(req, res)),
);
productsRouter.delete(
  "/:id/images/:imageId",
  authorize("INVENTARIO", "ADMINISTRACION"),
  asyncHandler((req, res) => productsController.removeImage(req, res)),
);
