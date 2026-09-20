import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils";

export const routesRouter = Router();
routesRouter.use(authenticate, authorize("COBRANZA", "VENTAS", "ADMINISTRACION"));

const routeSchema = z.object({
  name: z.string().trim().min(2, "El nombre de la ruta debe tener al menos 2 letras").max(80),
  area: z.string().trim().max(80).optional().or(z.literal("")).transform((value) => value || undefined),
  notes: z.string().trim().max(400).optional().or(z.literal("")).transform((value) => value || undefined),
  active: z.boolean().optional(),
});

routesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await prisma.collectionRoute.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { clients: true } } },
    });
    res.json({ success: true, data: items });
  }),
);

routesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const route = await prisma.collectionRoute.findUnique({
      where: { id: req.params.id },
      include: {
        clients: {
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            code: true,
            firstName: true,
            lastName: true,
            phone: true,
            city: true,
            address: true,
            locationUrl: true,
          },
        },
      },
    });
    if (!route) throw new AppError(404, "NOT_FOUND", "Ruta no encontrada");
    res.json({ success: true, data: route });
  }),
);

routesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = routeSchema.parse(req.body);
    const exists = await prisma.collectionRoute.findUnique({ where: { name: body.name } });
    if (exists) throw new AppError(409, "DUPLICATE", "Ya existe una ruta con ese nombre");
    const data = await prisma.collectionRoute.create({ data: body });
    res.status(201).json({ success: true, data });
  }),
);

routesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = routeSchema.partial().parse(req.body);
    const existing = await prisma.collectionRoute.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Ruta no encontrada");
    const data = await prisma.collectionRoute.update({ where: { id: req.params.id }, data: body });
    res.json({ success: true, data });
  }),
);

routesRouter.post(
  "/:id/clients",
  asyncHandler(async (req, res) => {
    const body = z.object({ clientIds: z.array(z.string().min(1)).min(1, "Elige al menos un cliente") }).parse(req.body);
    const existing = await prisma.collectionRoute.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Ruta no encontrada");
    await prisma.client.updateMany({
      where: { id: { in: body.clientIds } },
      data: { routeId: req.params.id },
    });
    const data = await prisma.collectionRoute.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { _count: { select: { clients: true } } },
    });
    res.json({ success: true, data });
  }),
);
