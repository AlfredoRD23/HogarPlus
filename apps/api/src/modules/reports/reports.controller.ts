import type { Request, Response } from "express";
import { reportsService } from "./reports.service";

export class ReportsController {
  async finance(_req: Request, res: Response) {
    const data = await reportsService.finance();
    res.json({ success: true, data });
  }
}

export const reportsController = new ReportsController();
