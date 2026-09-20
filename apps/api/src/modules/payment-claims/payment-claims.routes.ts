import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import type { AuthedRequest } from "../../middleware/auth";
import { paymentClaimsService } from "./payment-claims.service";

export const paymentClaimsRouter = Router();
paymentClaimsRouter.use(authenticate, authorize("COBRANZA", "ADMINISTRACION", "VENTAS"));

paymentClaimsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await paymentClaimsService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      status: req.query.status as string | undefined,
    });
    res.json({ success: true, data: data.items, meta: data.meta });
  }),
);

paymentClaimsRouter.post(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const actor = (req as AuthedRequest).user;
    const data = await paymentClaimsService.approve(id, actor.id, req.ip);
    res.json({ success: true, data });
  }),
);

paymentClaimsRouter.post(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = z.object({ reason: z.string().trim().max(400).optional() }).parse(req.body ?? {});
    const actor = (req as AuthedRequest).user;
    const data = await paymentClaimsService.reject(id, actor.id, body.reason);
    res.json({ success: true, data });
  }),
);
