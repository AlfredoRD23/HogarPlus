import type { Request, Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { usersService } from "./users.service";
import { createUserSchema, updateUserSchema } from "./users.schema";

export class UsersController {
  async list(req: Request, res: Response) {
    const data = await usersService.list({
      page: req.query.page,
      pageSize: req.query.pageSize,
      search: req.query.search as string | undefined,
    });
    res.json({ success: true, data: data.items, meta: data.meta });
  }

  async create(req: Request, res: Response) {
    const body = createUserSchema.parse(req.body);
    const actor = (req as AuthedRequest).user;
    const data = await usersService.create(body, actor.id, req.ip);
    res.status(201).json({ success: true, data });
  }

  async update(req: Request, res: Response) {
    const body = updateUserSchema.parse(req.body);
    const actor = (req as AuthedRequest).user;
    const data = await usersService.update(req.params.id, body, actor.id, req.ip);
    res.json({ success: true, data });
  }
}

export const usersController = new UsersController();
