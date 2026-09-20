import type { Request, Response } from "express";
import { dashboardService } from "./dashboard.service";

export class DashboardController {
  async summary(_req: Request, res: Response) {
    const data = await dashboardService.summary();
    res.json({ success: true, data });
  }
}

export const dashboardController = new DashboardController();
