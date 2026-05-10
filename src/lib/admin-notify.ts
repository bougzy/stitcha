/* -------------------------------------------------------------------------- */
/*  notifyAdmin()                                                                */
/*                                                                              */
/*  Single-line helper used by API routes that want to surface something to    */
/*  the admin queue (the bell + /admin notifications list).                    */
/*                                                                              */
/*  Best-effort — failures don't propagate up so the caller's main flow is   */
/*  never blocked by a notification write.                                     */
/* -------------------------------------------------------------------------- */

import {
  AdminNotification,
  type AdminNotificationKind,
  type AdminNotificationSeverity,
} from "@/lib/models/admin-notification";

interface NotifyAdminInput {
  kind: AdminNotificationKind;
  severity?: AdminNotificationSeverity;
  title: string;
  message: string;
  link?: string;
  meta?: Record<string, unknown>;
  designerId?: string;
}

export async function notifyAdmin(input: NotifyAdminInput): Promise<void> {
  try {
    await AdminNotification.create({
      kind: input.kind,
      severity: input.severity || "info",
      title: input.title,
      message: input.message,
      link: input.link,
      meta: input.meta,
      designerId: input.designerId,
    });
  } catch (err) {
    // Logged but never thrown — admin notifications must not break business flows.
    console.warn("notifyAdmin failed:", err);
  }
}
