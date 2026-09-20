import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { hasFullAccess, type AuthUser, type Role } from "@hogarplus/shared";
import { config } from "../config/env";
import { prisma } from "../lib/prisma";
import { AppError } from "../shared/utils";

export type AuthedRequest = Request & { user: AuthUser };

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "UNAUTHENTICATED", "Debe iniciar sesión"));
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
    (req as AuthedRequest).user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch {
    next(new AppError(401, "UNAUTHENTICATED", "Token inválido o vencido"));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthedRequest).user;
    if (!user) {
      next(new AppError(401, "UNAUTHENTICATED", "Debe iniciar sesión"));
      return;
    }
    if (roles.length && !roles.includes(user.role) && !hasFullAccess(user.role)) {
      next(new AppError(403, "FORBIDDEN", "No tiene permiso para esta acción"));
      return;
    }
    next();
  };
}

export async function writeAudit(params: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: params.before as object | undefined,
      after: params.after as object | undefined,
      ip: params.ip,
    },
  });
}
