import type { Request, Response } from "express";
import { authService } from "./auth.service";
import { loginSchema } from "./auth.schema";
import type { AuthedRequest } from "../../middleware/auth";

export class AuthController {
  async login(req: Request, res: Response) {
    const body = loginSchema.parse(req.body);
    const data = await authService.login(body.email, body.password);
    res.json({ success: true, data });
  }

  async me(req: Request, res: Response) {
    const data = await authService.me((req as AuthedRequest).user.id);
    res.json({ success: true, data });
  }
}

export const authController = new AuthController();
