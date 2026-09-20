import { Router } from "express";
import { z } from "zod";
import { catalogsForLevel } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../shared/http";
import { AppError } from "../../shared/utils";

export const portalRouter = Router();

const lookupSchema = z.object({
  documentId: z.string().min(5),
  phone: z.string().min(7),
});

portalRouter.post(
  "/lookup",
  asyncHandler(async (req, res) => {
    const body = lookupSchema.parse(req.body);
    const client = await prisma.client.findFirst({
      where: { documentId: body.documentId, phone: body.phone },
      include: {
        credits: {
          include: { product: true, installments: { orderBy: { number: "asc" } } },
          orderBy: { createdAt: "desc" },
        },
        payments: { where: { voidedAt: null }, orderBy: { createdAt: "desc" }, take: 12 },
        pointsLedger: { orderBy: { createdAt: "desc" }, take: 12 },
      },
    });

    if (!client) {
      throw new AppError(404, "NOT_FOUND", "No encontramos una cuenta con esos datos");
    }

    const tiers = catalogsForLevel(client.level);
    const catalog = await prisma.product.findMany({
      where: { status: "ACTIVE", catalogTier: { in: tiers } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, catalogTier: true, price: true, description: true },
    });

    res.json({
      success: true,
      data: {
        client: {
          code: client.code,
          name: `${client.firstName} ${client.lastName}`,
          points: client.points,
          level: client.level,
          affiliationPaid: client.affiliationPaid,
        },
        credits: client.credits,
        payments: client.payments,
        pointsLedger: client.pointsLedger,
        catalog,
      },
    });
  }),
);
