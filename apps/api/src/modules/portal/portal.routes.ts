import { Router } from "express";
import { z } from "zod";
import { digitsOnly, formatCedula, formatPhoneRD, isValidPhoneRD, productRequestAccess } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../shared/http";
import { markOverdueInstallments } from "../../shared/sla";
import { AppError } from "../../shared/utils";
import { notifyStaff } from "../notifications/notifications.service";

export const portalRouter = Router();

const identitySchema = z.object({
  documentId: z
    .string()
    .transform((value) => digitsOnly(value))
    .refine((value) => value.length === 11, { message: "La cédula debe tener 11 dígitos (000-0000000-0)" }),
  phone: z
    .string()
    .transform((value) => digitsOnly(value))
    .refine((value) => isValidPhoneRD(value), { message: "El teléfono debe tener 10 dígitos y iniciar con 809, 829 o 849" }),
});

async function findPortalClient(documentId: string, phone: string) {
  const client = await prisma.client.findFirst({
    where: {
      AND: [
        { OR: [{ documentId }, { documentId: formatCedula(documentId) }] },
        { OR: [{ phone }, { phone: formatPhoneRD(phone) }] },
      ],
    },
  });
  if (!client) throw new AppError(404, "NOT_FOUND", "No encontramos una cuenta con esos datos");
  return client;
}

portalRouter.post(
  "/lookup",
  asyncHandler(async (req, res) => {
    const body = identitySchema.parse(req.body);
    await markOverdueInstallments();
    const client = await prisma.client.findFirst({
      where: {
        AND: [
          { OR: [{ documentId: body.documentId }, { documentId: formatCedula(body.documentId) }] },
          { OR: [{ phone: body.phone }, { phone: formatPhoneRD(body.phone) }] },
        ],
      },
      include: {
        credits: {
          include: { product: true, installments: { orderBy: { number: "asc" } } },
          orderBy: { createdAt: "desc" },
        },
        payments: { where: { voidedAt: null }, orderBy: { createdAt: "desc" }, take: 12 },
        pointsLedger: { orderBy: { createdAt: "desc" }, take: 12 },
        productRequests: { where: { status: "PENDING" }, select: { productId: true } },
      },
    });

    if (!client) {
      throw new AppError(404, "NOT_FOUND", "No encontramos una cuenta con esos datos");
    }

    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ catalogTier: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, catalogTier: true, price: true, description: true },
    });
    const pendingIds = new Set(client.productRequests.map((item) => item.productId));
    const catalog = products.map((product) => {
      const access = productRequestAccess(client.level, product.catalogTier, client.catalogApproved);
      return {
        ...product,
        canRequest: access.canRequest,
        lockReason: access.lockReason,
        requested: pendingIds.has(product.id),
      };
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
          catalogApproved: client.catalogApproved,
        },
        credits: client.credits,
        payments: client.payments,
        pointsLedger: client.pointsLedger,
        catalog,
      },
    });
  }),
);

portalRouter.post(
  "/request",
  asyncHandler(async (req, res) => {
    const body = identitySchema.extend({ productId: z.string().min(1, "Selecciona un producto") }).parse(req.body);
    const client = await findPortalClient(body.documentId, body.phone);
    if (!client.affiliationPaid) {
      throw new AppError(400, "NO_AFFILIATION", "Debes tener la afiliación pagada para solicitar un producto");
    }
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product || product.status !== "ACTIVE") {
      throw new AppError(404, "NOT_FOUND", "Producto no disponible");
    }
    const access = productRequestAccess(client.level, product.catalogTier, client.catalogApproved);
    if (!access.canRequest) {
      throw new AppError(400, "CATALOG_LOCKED", access.lockReason ?? "Este producto no está disponible para tu categoría");
    }
    const existing = await prisma.productRequest.findFirst({
      where: { clientId: client.id, productId: product.id, status: "PENDING" },
    });
    if (existing) throw new AppError(409, "DUPLICATE", "Ya pediste este producto. El equipo lo está revisando");

    const request = await prisma.productRequest.create({
      data: { clientId: client.id, productId: product.id },
    });
    const title = "Nueva solicitud de producto";
    const message = `${client.firstName} ${client.lastName} (${client.code}) pidió ${product.name}. Tel. ${client.phone}.`;
    await notifyStaff({
      type: "PRODUCT_REQUEST",
      title,
      message,
      clientId: client.id,
      productId: product.id,
      requestId: request.id,
    });
    res.status(201).json({ success: true, data: { id: request.id, status: request.status } });
  }),
);

portalRouter.post(
  "/collect-me",
  asyncHandler(async (req, res) => {
    const body = identitySchema.extend({ note: z.string().max(200).optional() }).parse(req.body);
    const client = await findPortalClient(body.documentId, body.phone);
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recent = await prisma.inboxNotification.findFirst({
      where: { type: "COLLECT_ME", clientId: client.id, createdAt: { gt: since } },
    });
    if (recent) {
      throw new AppError(429, "TOO_SOON", "Ya avisamos al cobrador. Puedes volver a pedir en unas horas");
    }
    const extra = body.note?.trim() ? ` Nota: ${body.note.trim()}` : "";
    const title = "Ven a cobrarme";
    const message = `${client.firstName} ${client.lastName} (${client.code}) pide que pasen a cobrar. Tel. ${client.phone}.${extra}`;
    await notifyStaff({
      type: "COLLECT_ME",
      title,
      message,
      clientId: client.id,
      roles: ["DIRECCION", "COBRANZA", "ADMINISTRACION"],
    });
    res.status(201).json({ success: true, data: { ok: true } });
  }),
);
