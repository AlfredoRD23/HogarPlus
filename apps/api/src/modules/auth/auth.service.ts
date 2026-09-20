import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthUser } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { config } from "../../config/env";
import { AppError } from "../../shared/utils";

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos");
    }

    const payload: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    });
    return { token, user: payload };
  }

  async me(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, phone: true, active: true },
    });
    if (!user || !user.active) {
      throw new AppError(401, "INACTIVE", "Tu usuario está desactivado");
    }
    return user;
  }
}

export const authService = new AuthService();
