import type { Request, Response } from "express";
import { digitsOnly } from "@hogarplus/shared";
import { createReferralSchema } from "./referrals.schema";
import { referralsService } from "./referrals.service";

export class ReferralsController {
  async match(req: Request, res: Response) {
    const phone = digitsOnly(String(req.query.phone ?? ""));
    const data = phone ? await referralsService.matchByPhone(phone) : null;
    res.json({ success: true, data });
  }

  async list(req: Request, res: Response) {
    const data = await referralsService.listForClient(req.params.id);
    res.json({ success: true, data });
  }

  async create(req: Request, res: Response) {
    const body = createReferralSchema.parse(req.body);
    const data = await referralsService.createLead(req.params.id, body);
    res.status(201).json({ success: true, data });
  }
}

export const referralsController = new ReferralsController();
