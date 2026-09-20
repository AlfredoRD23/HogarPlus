import type { Request, Response } from "express";
import type { AuthedRequest } from "../../middleware/auth";
import { expensesService } from "./expenses.service";
import { createExpenseSchema } from "./expenses.schema";

export class ExpensesController {
  async list(req: Request, res: Response) {
    const data = await expensesService.list({ page: req.query.page, pageSize: req.query.pageSize });
    res.json({ success: true, data: data.items, meta: data.meta });
  }

  async create(req: Request, res: Response) {
    const body = createExpenseSchema.parse(req.body);
    const data = await expensesService.create(body, (req as AuthedRequest).user.id);
    res.status(201).json({ success: true, data });
  }
}

export const expensesController = new ExpensesController();
