import { PAYMENT_METHOD_LABELS } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { AppError, money, pagination } from "../../shared/utils";
import { portalUrl, sendClientTemplate } from "../../shared/mailer";
import { notifyStaff } from "../notifications/notifications.service";
import { paymentsService } from "../payments/payments.service";
import { moveUploadTo } from "../../lib/upload";

function formatRd(value: number) {
  return `RD$ ${value.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export class PaymentClaimsService {
  async list(query: { page?: unknown; pageSize?: unknown; status?: string }) {
    const { skip, take, page, pageSize } = pagination(query);
    const status =
      query.status === "PENDING" || query.status === "APPROVED" || query.status === "REJECTED"
        ? (query.status as "PENDING" | "APPROVED" | "REJECTED")
        : undefined;
    const where = status ? { status } : {};
    const [items, total] = await prisma.$transaction([
      prisma.paymentClaim.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, code: true, firstName: true, lastName: true, phone: true } },
          credit: {
            select: {
              id: true,
              code: true,
              balance: true,
              product: {
                select: {
                  name: true,
                  imageUrl: true,
                  images: { take: 1, orderBy: { createdAt: "asc" }, select: { path: true } },
                },
              },
            },
          },
          payment: { select: { id: true, code: true } },
        },
      }),
      prisma.paymentClaim.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        credit: {
          ...item.credit,
          product: {
            name: item.credit.product.name,
            imageUrl: item.credit.product.imageUrl || item.credit.product.images[0]?.path || null,
          },
        },
      })),
      meta: { page, pageSize, total },
    };
  }

  async createFromPortal(input: {
    clientId: string;
    creditId: string;
    amount: number;
    method: "CASH" | "TRANSFER" | "DEPOSIT";
    notes?: string;
    file?: Express.Multer.File;
  }) {
    const credit = await prisma.credit.findFirst({
      where: { id: input.creditId, clientId: input.clientId },
      include: {
        product: { select: { name: true } },
        client: { select: { firstName: true, lastName: true, code: true, phone: true, email: true } },
      },
    });
    if (!credit || credit.status !== "ACTIVE") {
      throw new AppError(400, "NO_CREDIT", "No hay un crédito activo para este aviso");
    }
    if (input.amount <= 0) throw new AppError(400, "INVALID_AMOUNT", "El monto debe ser mayor que 0");
    if (input.amount > Number(credit.balance) + 0.05) {
      throw new AppError(400, "OVERPAY", `El aviso no puede pasar el saldo de ${money(credit.balance)}`);
    }
    if ((input.method === "TRANSFER" || input.method === "DEPOSIT") && !input.file) {
      throw new AppError(400, "NO_FILE", "Sube la foto del comprobante");
    }

    const pending = await prisma.paymentClaim.findFirst({
      where: { clientId: input.clientId, creditId: input.creditId, status: "PENDING" },
    });
    if (pending) {
      throw new AppError(409, "DUPLICATE", "Ya tienes un aviso de pago en revisión para este producto");
    }

    const created = await prisma.paymentClaim.create({
      data: {
        clientId: input.clientId,
        creditId: input.creditId,
        amount: input.amount,
        method: input.method,
        notes: input.notes,
      },
    });

    let receiptPath: string | undefined;
    if (input.file) {
      receiptPath = moveUploadTo("claims", created.id, input.file);
      await prisma.paymentClaim.update({ where: { id: created.id }, data: { receiptPath } });
    }

    const methodLabel = PAYMENT_METHOD_LABELS[input.method];
    await notifyStaff({
      type: "PAYMENT_CLAIM",
      title: input.method === "CASH" ? "Cliente avisa pago en efectivo" : "Comprobante de pago",
      message: `${credit.client.firstName} ${credit.client.lastName} (${credit.client.code}) avisa ${methodLabel} de ${money(input.amount)} en ${credit.product.name} (${credit.code}). Tel. ${credit.client.phone}.`,
      clientId: input.clientId,
      requestId: created.id,
      roles: ["DIRECCION", "COBRANZA", "ADMINISTRACION"],
    });

    void sendClientTemplate(credit.client.email, "payment_claim_received", {
      clientName: `${credit.client.firstName} ${credit.client.lastName}`,
      productName: credit.product.name,
      amount: formatRd(money(input.amount)),
      method: methodLabel,
      creditCode: credit.code,
      portalUrl: portalUrl(),
    });

    return prisma.paymentClaim.findUniqueOrThrow({ where: { id: created.id } });
  }

  async approve(id: string, actorId: string, ip?: string) {
    const claim = await prisma.paymentClaim.findUnique({
      where: { id },
      include: {
        credit: { include: { product: { select: { name: true } } } },
        client: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!claim) throw new AppError(404, "NOT_FOUND", "Aviso de pago no encontrado");
    if (claim.status !== "PENDING") throw new AppError(400, "CLAIM_CLOSED", "Este aviso ya fue revisado");

    const payment = await paymentsService.create(
      {
        clientId: claim.clientId,
        creditId: claim.creditId,
        amount: Number(claim.amount),
        method: claim.method,
        notes: claim.notes || "Validado desde aviso del portal",
        receiptPath: claim.receiptPath ?? undefined,
      },
      actorId,
      ip,
      { notifyClient: false },
    );

    const updated = await prisma.paymentClaim.update({
      where: { id },
      data: {
        status: "APPROVED",
        paymentId: payment.id,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        credit: { select: { code: true, product: { select: { name: true } } } },
        payment: { select: { id: true, code: true, reference: true } },
      },
    });

    void sendClientTemplate(updated.client.email, "payment_claim_approved", {
      clientName: `${updated.client.firstName} ${updated.client.lastName}`,
      productName: updated.credit.product.name,
      amount: formatRd(money(claim.amount)),
      reference: updated.payment?.reference || updated.payment?.code,
      creditCode: updated.credit.code,
      portalUrl: portalUrl(),
    });

    return updated;
  }

  async reject(id: string, actorId: string, reason?: string) {
    const claim = await prisma.paymentClaim.findUnique({
      where: { id },
      include: {
        client: { select: { firstName: true, lastName: true, email: true } },
        credit: { select: { code: true, product: { select: { name: true } } } },
      },
    });
    if (!claim) throw new AppError(404, "NOT_FOUND", "Aviso de pago no encontrado");
    if (claim.status !== "PENDING") throw new AppError(400, "CLAIM_CLOSED", "Este aviso ya fue revisado");

    const updated = await prisma.paymentClaim.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectReason: reason,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
      include: {
        client: { select: { firstName: true, lastName: true, email: true } },
        credit: { select: { code: true, product: { select: { name: true } } } },
      },
    });

    void sendClientTemplate(updated.client.email, "payment_claim_rejected", {
      clientName: `${updated.client.firstName} ${updated.client.lastName}`,
      productName: updated.credit.product.name,
      amount: formatRd(money(claim.amount)),
      creditCode: updated.credit.code,
      reason: reason?.trim() || undefined,
      portalUrl: portalUrl(),
    });

    return updated;
  }
}

export const paymentClaimsService = new PaymentClaimsService();
