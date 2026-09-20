import { Router } from "express";
import { digitsOnly } from "@hogarplus/shared";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { prisma } from "../../lib/prisma";

export const searchRouter = Router();

searchRouter.use(authenticate);
searchRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const digits = digitsOnly(q);
    if (q.length < 2) {
      res.json({ success: true, data: { clients: [], products: [], credits: [] } });
      return;
    }

    const [clients, products, credits] = await Promise.all([
      prisma.client.findMany({
        where: {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { documentId: { contains: digits.length >= 3 ? digits : q } },
            { phone: { contains: digits.length >= 3 ? digits : q } },
            { code: { contains: q } },
          ],
        },
        take: 6,
        select: { id: true, code: true, firstName: true, lastName: true, phone: true },
      }),
      prisma.product.findMany({
        where: { OR: [{ name: { contains: q } }, { sku: { contains: q } }] },
        take: 6,
        select: { id: true, sku: true, name: true, price: true, stock: true },
      }),
      prisma.credit.findMany({
        where: {
          OR: [
            { code: { contains: q } },
            { client: { firstName: { contains: q } } },
            { client: { lastName: { contains: q } } },
          ],
        },
        take: 6,
        select: {
          id: true,
          code: true,
          balance: true,
          client: { select: { firstName: true, lastName: true } },
          product: { select: { name: true } },
        },
      }),
    ]);

    res.json({ success: true, data: { clients, products, credits } });
  }),
);
