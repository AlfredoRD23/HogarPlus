import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth";
import { settingsService } from "./settings.service";

const schema = z.object({
  affiliationFee: z.number().optional(),
  weeklyQuota: z.number().optional(),
  defaultWeeks: z.number().optional(),
  cashReservePercent: z.number().optional(),
  companyName: z.string().optional(),
  companyCity: z.string().optional(),
});

export class SettingsController {
  async get(_req: Request, res: Response) {
    const data = await settingsService.getAll();
    res.json({ success: true, data });
  }

  async update(req: Request, res: Response) {
    const body = schema.parse(req.body);
    const data = await settingsService.upsert(body, (req as AuthedRequest).user.id);
    res.json({ success: true, data });
  }
}

export const settingsController = new SettingsController();
