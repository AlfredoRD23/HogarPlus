import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize, type AuthedRequest } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { createClientOfferSchema } from "./client-offers.schema";
import { clientOffersService } from "./client-offers.service";

export const clientOffersRouter = Router();
clientOffersRouter.use(authenticate, authorize("VENTAS", "INVENTARIO"));

clientOffersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await clientOffersService.list({
      clientId: typeof req.query.clientId === "string" ? req.query.clientId : undefined,
      productId: typeof req.query.productId === "string" ? req.query.productId : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
    });
    res.json({ success: true, data });
  }),
);

clientOffersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createClientOfferSchema.parse(req.body);
    const data = await clientOffersService.create(body, (req as AuthedRequest).user.id, req.ip);
    res.status(201).json({ success: true, data });
  }),
);

clientOffersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const data = await clientOffersService.cancel(id, (req as AuthedRequest).user.id, req.ip);
    res.json({ success: true, data });
  }),
);
