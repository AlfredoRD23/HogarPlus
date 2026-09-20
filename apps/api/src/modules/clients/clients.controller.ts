import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth";
import { clientsService } from "./clients.service";
import { creditsService } from "../credits/credits.service";
import { createClientSchema, updateClientSchema } from "./clients.schema";
import { AppError } from "../../shared/utils";

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
    const { productId, ...clientInput } = body;
    const data = await clientsService.create(clientInput, actor.id, req.ip);
    if (productId) {
      try {
        const credit = await creditsService.create({ clientId: data.id, productId }, actor.id, req.ip);
        res.status(201).json({ success: true, data: { ...data, credit } });
        return;
      } catch (error) {
        if (error instanceof AppError) {
          throw new AppError(
            error.status,
            error.code,
            `${error.message}. El cliente sí quedó creado.`,
          );
        }
        throw error;
      }
    }
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

  async addImages(req: Request, res: Response) {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw new AppError(400, "NO_FILE", "Selecciona al menos una imagen");
    const data = await clientsService.addImages(req.params.id, files);
    res.status(201).json({ success: true, data });
  }

  async removeImage(req: Request, res: Response) {
    const data = await clientsService.removeImage(req.params.id, req.params.imageId);
    res.json({ success: true, data });
  }
}

export const clientsController = new ClientsController();
