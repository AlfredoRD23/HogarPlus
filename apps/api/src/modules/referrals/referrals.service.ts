import { Prisma } from "@prisma/client";
import { POINTS_RULES, digitsOnly, formatPhoneRD, levelFromPoints, namesLookAlike, type NotificationType } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../shared/utils";
import { notifyStaff } from "../notifications/notifications.service";
import type { z } from "zod";
import type { createReferralSchema } from "./referrals.schema";

const MAX_PENDING = 8;

export type StaffNotice = {
  type: NotificationType;
  title: string;
  message: string;
  clientId?: string;
};

function referralSelect() {
  return {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    status: true,
    pointsAwarded: true,
    createdAt: true,
    registeredClientId: true,
    referrer: { select: { id: true, code: true, firstName: true, lastName: true, phone: true } },
    registeredClient: { select: { id: true, code: true, firstName: true, lastName: true } },
  } satisfies Prisma.ReferralSelect;
}

async function addReferralPoints(
  tx: Prisma.TransactionClient,
  referrerId: string,
  note: string,
) {
  const client = await tx.client.findUniqueOrThrow({ where: { id: referrerId } });
  const nextPoints = client.points + POINTS_RULES.REFERRAL;
  await tx.pointsLedger.create({
    data: {
      clientId: referrerId,
      action: "REFERRAL",
      points: POINTS_RULES.REFERRAL,
      note,
    },
  });
  await tx.client.update({
    where: { id: referrerId },
    data: { points: nextPoints, level: levelFromPoints(nextPoints) },
  });
}

export class ReferralsService {
  async listForClient(referrerId: string) {
    return prisma.referral.findMany({
      where: { referrerId },
      orderBy: { createdAt: "desc" },
      select: referralSelect(),
    });
  }

  async matchByPhone(phone: string) {
    const digits = digitsOnly(phone);
    if (digits.length < 10) return null;
    return prisma.referral.findFirst({
      where: {
        status: "PENDING",
        OR: [{ phone: digits }, { phone: formatPhoneRD(digits) }],
      },
      select: referralSelect(),
    });
  }

  async createLead(referrerId: string, input: z.infer<typeof createReferralSchema>) {
    const referrer = await prisma.client.findUnique({ where: { id: referrerId } });
    if (!referrer) throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");
    if (referrer.status !== "ACTIVE") {
      throw new AppError(400, "CLIENT_INACTIVE", "El cliente no está activo");
    }
    if (digitsOnly(referrer.phone) === input.phone) {
      throw new AppError(400, "SELF_REFERRAL", "No puede referirse a sí mismo");
    }

    const existingClient = await prisma.client.findFirst({
      where: { OR: [{ phone: input.phone }, { phone: formatPhoneRD(input.phone) }] },
    });
    if (existingClient) {
      throw new AppError(409, "ALREADY_CLIENT", "Ese teléfono ya pertenece a un cliente de HogarPlus");
    }

    const pendingSame = await prisma.referral.findFirst({
      where: {
        status: "PENDING",
        OR: [{ phone: input.phone }, { phone: formatPhoneRD(input.phone) }],
      },
    });
    if (pendingSame) {
      if (pendingSame.referrerId === referrerId) {
        throw new AppError(409, "DUPLICATE", "Ya enviaste este referido. El equipo lo está atendiendo");
      }
      throw new AppError(409, "DUPLICATE", "Ese teléfono ya está referido. El equipo lo está atendiendo");
    }

    const pendingCount = await prisma.referral.count({ where: { referrerId, status: "PENDING" } });
    if (pendingCount >= MAX_PENDING) {
      throw new AppError(400, "TOO_MANY", `Puede tener hasta ${MAX_PENDING} referidos pendientes`);
    }

    const referral = await prisma.referral.create({
      data: {
        referrerId,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
      select: referralSelect(),
    });

    await notifyStaff({
      type: "REFERRAL_LEAD",
      title: "Nuevo referido",
      message: `${referrer.firstName} ${referrer.lastName} (${referrer.code}) refirió a ${input.firstName} ${input.lastName}. Tel. ${formatPhoneRD(input.phone)}. Cuando lo entres al sistema se validan nombre y teléfono y se le suman ${POINTS_RULES.REFERRAL} puntos a ${referrer.firstName}.`,
      clientId: referrer.id,
    });

    return referral;
  }

  async convertForNewClient(
    tx: Prisma.TransactionClient,
    client: {
      id: string;
      code: string;
      firstName: string;
      lastName: string;
      phone: string;
      referredById: string | null;
    },
  ): Promise<StaffNotice[]> {
    const notices: StaffNotice[] = [];
    const digits = digitsOnly(client.phone);
    const pending = await tx.referral.findFirst({
      where: {
        status: "PENDING",
        OR: [{ phone: digits }, { phone: formatPhoneRD(digits) }],
      },
    });

    let referredById = client.referredById;
    let referralId: string | undefined;

    if (pending) {
      const nameOk =
        namesLookAlike(pending.firstName, client.firstName) ||
        namesLookAlike(`${pending.firstName} ${pending.lastName}`, `${client.firstName} ${client.lastName}`);

      if (!nameOk && !client.referredById) {
        notices.push({
          type: "REFERRAL_LEAD",
          title: "Referido: revisa el nombre",
          message: `El teléfono ${formatPhoneRD(digits)} coincide con el referido ${pending.firstName} ${pending.lastName}, pero el cliente creado es ${client.firstName} ${client.lastName}. No se sumaron puntos. Confirma si es la misma persona.`,
          clientId: pending.referrerId,
        });
      } else {
        referredById = client.referredById || pending.referrerId;
        referralId = pending.id;
        if (!client.referredById) {
          await tx.client.update({
            where: { id: client.id },
            data: { referredById: pending.referrerId },
          });
        }
        await tx.referral.update({
          where: { id: pending.id },
          data: { status: "REGISTERED", registeredClientId: client.id },
        });
      }
    } else if (client.referredById) {
      const created = await tx.referral.create({
        data: {
          referrerId: client.referredById,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: digits,
          status: "REGISTERED",
          registeredClientId: client.id,
        },
      });
      referralId = created.id;
    }

    if (referredById) {
      const awarded = await this.awardIfNeeded(tx, referredById, client, referralId);
      if (awarded) {
        const referrer = await tx.client.findUnique({ where: { id: referredById } });
        if (referrer) {
          notices.push({
            type: "REFERRAL_REGISTERED",
            title: "Referido ya está en el sistema",
            message: `${client.firstName} ${client.lastName} (${client.code}) quedó validado. Lo trajo ${referrer.firstName} ${referrer.lastName} (${referrer.code}) y se le sumaron ${POINTS_RULES.REFERRAL} puntos.`,
            clientId: client.id,
          });
        }
      }
    }

    return notices;
  }

  private async awardIfNeeded(
    tx: Prisma.TransactionClient,
    referrerId: string,
    client: { id: string; code: string },
    referralId?: string,
  ) {
    const already = await tx.pointsLedger.findFirst({
      where: { clientId: referrerId, action: "REFERRAL", note: { contains: client.code } },
    });
    const referral = referralId
      ? await tx.referral.findUnique({ where: { id: referralId } })
      : await tx.referral.findFirst({ where: { registeredClientId: client.id } });
    if (already || referral?.pointsAwarded) {
      if (referral && !referral.pointsAwarded) {
        await tx.referral.update({ where: { id: referral.id }, data: { pointsAwarded: true } });
      }
      return false;
    }

    await addReferralPoints(tx, referrerId, `Referido ${client.code} ingresado al sistema`);
    if (referral) {
      await tx.referral.update({ where: { id: referral.id }, data: { pointsAwarded: true } });
    }
    return true;
  }
}

export const referralsService = new ReferralsService();
