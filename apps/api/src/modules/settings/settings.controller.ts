import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth";
import { settingsService } from "./settings.service";

const schema = z.object({
  affiliationFee: z.coerce.number().positive("La afiliación debe ser mayor que 0").max(9_999_999.99).optional(),
  weeklyQuota: z.coerce.number().positive("La cuota semanal debe ser mayor que 0").max(9_999_999.99).optional(),
  defaultWeeks: z.coerce.number().int().min(1, "Debe haber al menos 1 semana").max(104).optional(),
  cashReservePercent: z.coerce.number().min(0, "El porcentaje no puede ser negativo").max(100, "El porcentaje máximo es 100").optional(),
  companyName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(80).optional(),
  companyCity: z.string().trim().min(2, "La ubicación debe tener al menos 2 caracteres").max(50).optional(),
});

export class SettingsController {
  async get(_req: Request, res: Response) {
    const data = await settingsService.getAll();
    res.json({ success: true, data });
  }

  async public(_req: Request, res: Response) {
    const all = await settingsService.getAll();
    res.json({
      success: true,
      data: {
        companyName: all.companyName,
        companyCity: all.companyCity,
        affiliationFee: all.affiliationFee,
      },
    });
  }

  async update(req: Request, res: Response) {
    const body = schema.parse(req.body);
    const data = await settingsService.upsert(body, (req as AuthedRequest).user.id);
    res.json({ success: true, data });
  }
}

export const settingsController = new SettingsController();
