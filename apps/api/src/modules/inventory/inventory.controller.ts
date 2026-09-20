import type { Request, Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { inventoryService } from "./inventory.service";
import { movementSchema } from "./inventory.schema";

export class InventoryController {
  async list(req: Request, res: Response) {
    const data = await inventoryService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      productId: req.query.productId as string | undefined,
      type: req.query.type as string | undefined,
    });
    res.json({ success: true, data: { movements: data.items, summary: data.summary }, meta: data.meta });
  }

  async move(req: Request, res: Response) {
    const body = movementSchema.parse(req.body);
    const data = await inventoryService.move(body, (req as AuthedRequest).user.id, req.ip);
    res.status(201).json({ success: true, data });
  }
}

export const inventoryController = new InventoryController();
