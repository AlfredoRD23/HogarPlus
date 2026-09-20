import type { Request, Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { productsService } from "./products.service";
import { createProductSchema, updateProductSchema } from "./products.schema";

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
}

export const productsController = new ProductsController();
