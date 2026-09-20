import { Prisma } from "@prisma/client";
import { levelFromPoints, POINTS_RULES, digitsOnly } from "@hogarplus/shared";
import { settingsService } from "../settings/settings.service";
import { prisma } from "../../lib/prisma";
import { markOverdueInstallments } from "../../shared/sla";
import { AppError, nextCode, pagination } from "../../shared/utils";
import { writeAudit } from "../../middleware/auth";
import type { z } from "zod";
import type { createClientSchema, updateClientSchema } from "./clients.schema";

const clientSelect = {
  id: true,
  code: true,
  firstName: true,
  lastName: true,
  documentId: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  province: true,
  status: true,
  points: true,
  level: true,
  catalogApproved: true,
  affiliationPaid: true,
  affiliationAt: true,
  referredById: true,
  notes: true,
  locationUrl: true,
  routeId: true,
  createdAt: true,
  referredBy: { select: { id: true, code: true, firstName: true, lastName: true } },
  route: { select: { id: true, name: true, area: true } },
} satisfies Prisma.ClientSelect;

export class ClientsService {
  async list(query: { page?: unknown; pageSize?: unknown; search?: string; status?: string; level?: string }) {
    const { skip, take, page, pageSize } = pagination(query);
    const search = query.search?.trim();
    const digits = search ? digitsOnly(search) : "";
    const where: Prisma.ClientWhereInput = {
      ...(query.status ? { status: query.status as Prisma.EnumClientStatusFilter["equals"] } : {}),
      ...(query.level ? { level: query.level as Prisma.EnumClientLevelFilter["equals"] } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { code: { contains: search } },
              ...(digits.length >= 3
                ? [{ documentId: { contains: digits } }, { phone: { contains: digits } }]
                : [{ documentId: { contains: search } }, { phone: { contains: search } }]),
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          ...clientSelect,
          _count: { select: { credits: true } },
          credits: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              startDate: true,
              balance: true,
              weeklyQuota: true,
              weeks: true,
              frequency: true,
              downPayment: true,
              product: { select: { name: true } },
              installments: {
                where: { status: { not: "PAID" } },
                orderBy: { dueDate: "asc" },
                take: 1,
                select: { dueDate: true, amount: true, number: true, status: true },
              },
            },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return { items, meta: { page, pageSize, total } };
  }

  async get(id: string) {
    await markOverdueInstallments();
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        ...clientSelect,
        credits: {
          include: { product: true, installments: { orderBy: { number: "asc" } } },
          orderBy: { createdAt: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" }, take: 20 },
        pointsLedger: { orderBy: { createdAt: "desc" }, take: 30 },
        collectionNotes: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 15 },
      },
    });
    if (!client) throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");
    return client;
  }

  async create(input: z.infer<typeof createClientSchema>, actorId: string, ip?: string) {
    const exists = await prisma.client.findUnique({ where: { documentId: input.documentId } });
    if (exists) throw new AppError(409, "DUPLICATE", "Ya existe un cliente con esa cédula");

    const client = await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          code: await nextCode("client", "CLI"),
          firstName: input.firstName,
          lastName: input.lastName,
          documentId: input.documentId,
          phone: input.phone,
          email: input.email || null,
          address: input.address,
          city: input.city,
          province: input.province ?? "República Dominicana",
          referredById: input.referredById,
          notes: input.notes,
          locationUrl: input.locationUrl,
          routeId: input.routeId,
          createdById: actorId,
        },
      });

      if (input.payAffiliation) {
        await this.payAffiliationInTx(tx, created.id, input.referredById, actorId, input.affiliationMethod ?? "CASH");
      }

      return tx.client.findUniqueOrThrow({ where: { id: created.id }, select: clientSelect });
    });

    await writeAudit({ userId: actorId, action: "CREATE", entity: "Client", entityId: client.id, after: client, ip });
    return client;
  }

  async update(id: string, input: z.infer<typeof updateClientSchema>, actorId: string, ip?: string) {
    const before = await prisma.client.findUnique({ where: { id } });
    if (!before) throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");

    const client = await prisma.client.update({
      where: { id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        email: input.email || undefined,
        address: input.address,
        city: input.city,
        province: input.province,
        status: input.status,
        catalogApproved: input.catalogApproved,
        notes: input.notes,
        locationUrl: input.locationUrl === undefined ? undefined : input.locationUrl,
        routeId: input.routeId === undefined ? undefined : input.routeId || null,
      },
      select: clientSelect,
    });

    await writeAudit({ userId: actorId, action: "UPDATE", entity: "Client", entityId: id, before, after: client, ip });
    return client;
  }

  async payAffiliation(clientId: string, method: "CASH" | "TRANSFER" | "DEPOSIT", actorId: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");
    if (client.affiliationPaid) throw new AppError(409, "ALREADY_PAID", "La afiliación ya fue pagada");

    return prisma.$transaction((tx) => this.payAffiliationInTx(tx, clientId, client.referredById, actorId, method));
  }

  private async payAffiliationInTx(
    tx: Prisma.TransactionClient,
    clientId: string,
    referredById: string | null | undefined,
    actorId: string,
    method: "CASH" | "TRANSFER" | "DEPOSIT",
  ) {
    const settings = await settingsService.getAll();
    const payment = await tx.payment.create({
      data: {
        code: await nextCode("payment", "PAG"),
        clientId,
        amount: settings.affiliationFee,
        method,
        type: "AFFILIATION",
        notes: "Afiliación / contrato",
        createdById: actorId,
      },
    });

    await this.addPoints(tx, clientId, "AFFILIATION", POINTS_RULES.AFFILIATION, {
      paymentId: payment.id,
      note: "Completar afiliación/contrato",
    });

    if (referredById) {
      await this.addPoints(tx, referredById, "REFERRAL", POINTS_RULES.REFERRAL, {
        note: "Referido que completó afiliación",
      });
    }

    return tx.client.update({
      where: { id: clientId },
      data: { affiliationPaid: true, affiliationAt: new Date() },
      select: clientSelect,
    });
  }

  async addPoints(
    tx: Prisma.TransactionClient,
    clientId: string,
    action: Prisma.PointsLedgerCreateInput["action"],
    points: number,
    extra?: { paymentId?: string; creditId?: string; note?: string },
  ) {
    const client = await tx.client.findUniqueOrThrow({ where: { id: clientId } });
    const nextPoints = client.points + points;
    const level = levelFromPoints(nextPoints);

    await tx.pointsLedger.create({
      data: {
        clientId,
        action,
        points,
        paymentId: extra?.paymentId,
        creditId: extra?.creditId,
        note: extra?.note,
      },
    });

    return tx.client.update({
      where: { id: clientId },
      data: { points: nextPoints, level },
    });
  }
}

export const clientsService = new ClientsService();
