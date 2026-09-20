import type { Request, Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { paymentsService } from "./payments.service";
import { createPaymentSchema, voidPaymentSchema } from "./payments.schema";

export class PaymentsController {
  async list(req: Request, res: Response) {
    const data = await paymentsService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      clientId: req.query.clientId as string | undefined,
      creditId: req.query.creditId as string | undefined,
    });
    res.json({ success: true, data: data.items, meta: data.meta });
  }

  async get(req: Request, res: Response) {
    const data = await paymentsService.get(req.params.id);
    res.json({ success: true, data });
  }

  async create(req: Request, res: Response) {
    const body = createPaymentSchema.parse(req.body);
    const data = await paymentsService.create(body, (req as AuthedRequest).user.id, req.ip);
    res.status(201).json({ success: true, data });
  }

  async voidPayment(req: Request, res: Response) {
    const body = voidPaymentSchema.parse(req.body);
    const data = await paymentsService.voidPayment(
      req.params.id,
      body.reason,
      (req as AuthedRequest).user.id,
      req.ip,
    );
    res.json({ success: true, data });
  }
}

export const paymentsController = new PaymentsController();
