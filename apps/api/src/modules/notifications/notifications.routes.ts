import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../shared/http";
import type { AuthedRequest } from "../../middleware/auth";
import { prisma } from "../../lib/prisma";
import { listNotifications } from "./notifications.service";

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === "1";
    const data = await listNotifications((req as AuthedRequest).user.id, unreadOnly);
    res.json({ success: true, data: data.items, meta: { unread: data.unread } });
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.inboxNotification.updateMany({
      where: { userId: (req as AuthedRequest).user.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ success: true, data: { ok: true } });
  }),
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    await prisma.inboxNotification.updateMany({
      where: { id, userId: (req as AuthedRequest).user.id },
      data: { readAt: new Date() },
    });
    res.json({ success: true, data: { ok: true } });
  }),
);
