import type { Request, Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { productsService } from "./products.service";
import { createProductSchema, updateProductSchema } from "./products.schema";
import { AppError } from "../../shared/utils";

export class ProductsController {
  async list(req: Request, res: Response) {
    const data = await productsService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search as string | undefined,
      category: req.query.category as string | undefined,
      catalogTier: req.query.catalogTier as string | undefined,
      status: req.query.status as string | undefined,
    });
    res.json({ success: true, data: data.items, meta: data.meta });
  }

  async listPublic(_req: Request, res: Response) {
    const data = await productsService.listPublic();
    res.json({ success: true, data });
  }

  async get(req: Request, res: Response) {
    const data = await productsService.get(req.params.id);
    res.json({ success: true, data });
  }

  async create(req: Request, res: Response) {
    const body = createProductSchema.parse(req.body);
    const data = await productsService.create(body, (req as AuthedRequest).user.id, req.ip);
    res.status(201).json({ success: true, data });
  }

  async update(req: Request, res: Response) {
    const body = updateProductSchema.parse(req.body);
    const data = await productsService.update(req.params.id, body, (req as AuthedRequest).user.id, req.ip);
    res.json({ success: true, data });
  }

  async addImages(req: Request, res: Response) {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) throw new AppError(400, "NO_FILE", "Selecciona al menos una imagen");
    const data = await productsService.addImages(req.params.id, files);
    res.status(201).json({ success: true, data });
  }

  async remove(req: Request, res: Response) {
    const data = await productsService.remove(req.params.id, (req as AuthedRequest).user.id, req.ip);
    res.json({ success: true, data });
  }

  async removeImage(req: Request, res: Response) {
    const data = await productsService.removeImage(req.params.id, req.params.imageId);
    res.json({ success: true, data });
  }
}

export const productsController = new ProductsController();
