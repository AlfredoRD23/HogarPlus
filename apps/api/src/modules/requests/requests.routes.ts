import { Router } from "express";
import { z } from "zod";
import { REQUEST_STATUSES } from "@hogarplus/shared";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { prisma } from "../../lib/prisma";
import { AppError, pagination } from "../../shared/utils";

export const requestsRouter = Router();
requestsRouter.use(authenticate, authorize("VENTAS", "COBRANZA", "ADMINISTRACION"));

requestsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = pagination(req.query);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const where = status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {};
    const [items, total] = await Promise.all([
      prisma.productRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, code: true, firstName: true, lastName: true, phone: true, level: true } },
          product: { select: { id: true, name: true, catalogTier: true, price: true } },
        },
      }),
      prisma.productRequest.count({ where }),
    ]);
    res.json({ success: true, data: items, meta: { page, pageSize, total } });
  }),
);

requestsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = z.object({ status: z.enum(REQUEST_STATUSES) }).parse(req.body);
    const existing = await prisma.productRequest.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Solicitud no encontrada");
    const data = await prisma.productRequest.update({
      where: { id },
      data: { status: body.status },
      include: {
        client: { select: { id: true, code: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true } },
      },
    });
    res.json({ success: true, data });
  }),
);
