import type { Request, Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { collectionsService } from "./collections.service";
import { noteSchema } from "./collections.schema";

export class CollectionsController {
  async board(_req: Request, res: Response) {
    const data = await collectionsService.board();
    res.json({ success: true, data });
  }

  async addNote(req: Request, res: Response) {
    const body = noteSchema.parse(req.body);
    const data = await collectionsService.addNote(body, (req as AuthedRequest).user.id);
    res.status(201).json({ success: true, data });
  }
}

export const collectionsController = new CollectionsController();
