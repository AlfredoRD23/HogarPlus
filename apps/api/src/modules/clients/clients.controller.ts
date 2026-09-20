import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth";
import { clientsService } from "./clients.service";
import { createClientSchema, updateClientSchema } from "./clients.schema";

export class ClientsController {
  async list(req: Request, res: Response) {
    const data = await clientsService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      level: req.query.level as string | undefined,
    });
    res.json({ success: true, data: data.items, meta: data.meta });
  }

  async get(req: Request, res: Response) {
    const data = await clientsService.get(req.params.id);
    res.json({ success: true, data });
  }

  async create(req: Request, res: Response) {
    const body = createClientSchema.parse(req.body);
    const actor = (req as AuthedRequest).user;
    const data = await clientsService.create(body, actor.id, req.ip);
    res.status(201).json({ success: true, data });
  }

  async update(req: Request, res: Response) {
    const body = updateClientSchema.parse(req.body);
    const actor = (req as AuthedRequest).user;
    const data = await clientsService.update(req.params.id, body, actor.id, req.ip);
    res.json({ success: true, data });
  }

  async payAffiliation(req: Request, res: Response) {
    const body = z.object({ method: z.enum(["CASH", "TRANSFER", "DEPOSIT"]).default("CASH") }).parse(req.body);
    const actor = (req as AuthedRequest).user;
    const data = await clientsService.payAffiliation(req.params.id, body.method, actor.id);
    res.json({ success: true, data });
  }
}

export const clientsController = new ClientsController();
