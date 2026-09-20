import type { Request, Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { creditsService } from "./credits.service";
import { createCreditSchema, updateCreditSchema } from "./credits.schema";

export class CreditsController {
  async list(req: Request, res: Response) {
    const data = await creditsService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      clientId: req.query.clientId as string | undefined,
    });
    res.json({ success: true, data: data.items, meta: data.meta });
  }

  async get(req: Request, res: Response) {
    const data = await creditsService.get(req.params.id);
    res.json({ success: true, data });
  }

  async create(req: Request, res: Response) {
    const body = createCreditSchema.parse(req.body);
    const data = await creditsService.create(body, (req as AuthedRequest).user.id, req.ip);
    res.status(201).json({ success: true, data });
  }

  async update(req: Request, res: Response) {
    const body = updateCreditSchema.parse(req.body);
    const data = await creditsService.update(req.params.id, body, (req as AuthedRequest).user.id, req.ip);
    res.json({ success: true, data });
  }
}

export const creditsController = new CreditsController();
