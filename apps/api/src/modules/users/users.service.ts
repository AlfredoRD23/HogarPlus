import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError, pagination } from "../../shared/utils";
import { writeAudit } from "../../middleware/auth";
import type { createUserSchema, updateUserSchema } from "./users.schema";
import type { z } from "zod";

export class UsersService {
  async list(query: { page?: unknown; pageSize?: unknown; search?: string }) {
    const { skip, take, page, pageSize } = pagination(query);
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          active: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, meta: { page, pageSize, total } };
  }

  async create(input: z.infer<typeof createUserSchema>, actorId: string, ip?: string) {
    const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (exists) {
      throw new AppError(409, "DUPLICATE", "Ya existe un usuario con ese correo");
    }

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone,
        role: input.role,
        passwordHash: await bcrypt.hash(input.password, 10),
      },
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    await writeAudit({
      userId: actorId,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      after: user,
      ip,
    });

    return user;
  }

  async update(id: string, input: z.infer<typeof updateUserSchema>, actorId: string, ip?: string) {
    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) throw new AppError(404, "NOT_FOUND", "Usuario no encontrado");
    if (input.active === false && id === actorId) {
      throw new AppError(400, "SELF_DISABLE", "No puedes desactivar tu propia cuenta");
    }
    if (input.active === false && before.role === "DIRECCION") {
      const others = await prisma.user.count({
        where: { role: "DIRECCION", active: true, id: { not: id } },
      });
      if (others === 0) {
        throw new AppError(400, "LAST_DIRECCION", "Debe quedar al menos un usuario de Dirección activo");
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        phone: input.phone,
        role: input.role,
        active: input.active,
        passwordHash: input.password ? await bcrypt.hash(input.password, 10) : undefined,
      },
      select: { id: true, email: true, name: true, role: true, active: true, phone: true },
    });

    await writeAudit({
      userId: actorId,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      before,
      after: user,
      ip,
    });

    return user;
  }
}

export const usersService = new UsersService();
