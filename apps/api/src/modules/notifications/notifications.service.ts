import { Prisma, type Role } from "@prisma/client";
import type { NotificationType } from "@hogarplus/shared";
import { prisma } from "../../lib/prisma";
import { sendStaffEmail } from "../../shared/mailer";

const STAFF_ROLES: Role[] = ["DIRECCION", "VENTAS", "COBRANZA", "ADMINISTRACION"];

export async function notifyStaff(input: {
  type: NotificationType;
  title: string;
  message: string;
  clientId?: string;
  productId?: string;
  requestId?: string;
  roles?: Role[];
}) {
  const users = await prisma.user.findMany({
    where: { active: true, role: { in: input.roles ?? STAFF_ROLES } },
    select: { id: true, email: true },
  });
  if (users.length === 0) return [];

  await prisma.inboxNotification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      type: input.type,
      title: input.title,
      message: input.message,
      clientId: input.clientId,
      productId: input.productId,
      requestId: input.requestId,
    })),
  });

  const emailed = await sendStaffEmail(
    users.map((user) => user.email),
    input.title,
    input.message,
  );
  if (emailed) {
    await prisma.inboxNotification.updateMany({
      where: { userId: { in: users.map((user) => user.id) }, requestId: input.requestId ?? undefined, title: input.title },
      data: { emailSent: true },
    });
  }
  return users;
}

export async function listNotifications(userId: string, unreadOnly = false) {
  const where: Prisma.InboxNotificationWhereInput = {
    userId,
    ...(unreadOnly ? { readAt: null } : {}),
  };
  const [items, unread] = await Promise.all([
    prisma.inboxNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.inboxNotification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unread };
}
