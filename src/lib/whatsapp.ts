/* -------------------------------------------------------------------------- */
/*  WhatsApp Integration Module                                                */
/*  Generates pre-filled wa.me links for all communication flows               */
/*  Supports English and Pidgin English modes                                  */
/* -------------------------------------------------------------------------- */

import { MEASUREMENT_TYPES } from "@/lib/constants";

export type MessageLanguage = "english" | "pidgin";

/* ---- Phone number formatting for wa.me links ---- */
function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]+/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("0")) cleaned = "234" + cleaned.slice(1);
  if (!cleaned.startsWith("234")) cleaned = "234" + cleaned;
  return cleaned;
}

function waLink(phone: string, message: string): string {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(message)}`;
}

function amt(n: number): string {
  return `₦${n.toLocaleString()}`;
}

/* -------------------------------------------------------------------------- */
/*  Message Templates (English + Pidgin)                                       */
/* -------------------------------------------------------------------------- */

export const whatsapp = {
  /** Payment reminder */
  paymentReminder(
    phone: string,
    clientName: string,
    orderTitle: string,
    balance: number,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 🙏\n\nAbeg, e still remain *${amt(balance)}* for your *${orderTitle}* order o.\n\nYou fit pay through bank transfer or cash. Make I send you account details?\n\nThank you! 🙏`
        : `Hi ${clientName},\n\nThis is a friendly reminder that your *${orderTitle}* order has an outstanding balance of *${amt(balance)}*.\n\nYou can pay via bank transfer or cash. Would you like me to send account details?\n\nThank you! 🙏`;
    return waLink(phone, msg);
  },

  /** Order status update */
  statusUpdate(
    phone: string,
    clientName: string,
    orderTitle: string,
    status: string,
    dueDate?: string,
    businessName?: string,
    lang: MessageLanguage = "english"
  ): string {
    const labels: Record<string, { en: string; pidgin: string }> = {
      pending: { en: "pending confirmation", pidgin: "dey wait for confirmation" },
      confirmed: { en: "confirmed and queued", pidgin: "don confirm, e dey queue" },
      cutting: { en: "now being cut", pidgin: "dem don start to cut am" },
      sewing: { en: "currently being sewn", pidgin: "dem dey sew am now" },
      fitting: { en: "ready for fitting", pidgin: "ready for fitting" },
      finishing: { en: "in the finishing stage", pidgin: "almost done — dem dey finish am" },
      ready: { en: "READY for pickup! 🎉", pidgin: "DON READY! Come collect am! 🎉" },
      delivered: { en: "delivered successfully ✅", pidgin: "don deliver finish ✅" },
    };
    const s = labels[status] || { en: status, pidgin: status };
    const due = dueDate
      ? `\nExpected ready date: ${new Date(dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`
      : "";
    const biz = businessName ? `\n\n— ${businessName}` : "";

    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 👋\n\nUpdate about your *${orderTitle}*:\nE ${s.pidgin}.${due}${biz}`
        : `Hi ${clientName},\n\nUpdate on your *${orderTitle}*:\nYour order is ${s.en}.${due}${biz}`;
    return waLink(phone, msg);
  },

  /** Fitting appointment */
  fittingInvite(
    phone: string,
    clientName: string,
    orderTitle: string,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! ✂️\n\nYour *${orderTitle}* don reach fitting stage! When you go fit come try am?\n\nJust pick time wey work for you and I go prepare. 🙏`
        : `Hi ${clientName},\n\nYour *${orderTitle}* is ready for a fitting! When would you be available to come in?\n\nPlease let me know a convenient time and I'll have everything prepared. ✂️`;
    return waLink(phone, msg);
  },

  /** Order ready for pickup */
  orderReady(
    phone: string,
    clientName: string,
    orderTitle: string,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 🎉🎉\n\nGREAT NEWS! Your *${orderTitle}* don ready!\n\nYou fit come collect am anytime. Just tell me when you wan come.\n\nThank you for your patience! 🙏`
        : `Hi ${clientName}! 🎉\n\nGreat news — your *${orderTitle}* is ready for collection!\n\nPlease let me know when you'd like to pick it up. I look forward to seeing you!\n\nThank you for your patience! 🙏`;
    return waLink(phone, msg);
  },

  /** Scan link invitation */
  scanInvite(
    phone: string,
    clientName: string,
    scanUrl: string,
    designerName?: string,
    garmentType?: string,
    lang: MessageLanguage = "english"
  ): string {
    const designer = designerName || "Your designer";
    const garment = garmentType ? ` for your upcoming *${garmentType}*` : "";
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 👋\n\n${designer} need your body measurements${garment}.\n\nJust click this link and take 2 quick photos — e go take less than 2 minutes:\n\n${scanUrl}\n\n📱 Open am for your phone\n⏰ Link go expire in 24 hours\n🔒 Your photos no dey leave your phone\n\nThank you! 🙏`
        : `Hi ${clientName}! 👋\n\n${designer} needs your body measurements${garment}.\n\nPlease click the link below and follow the simple steps — it takes less than 2 minutes:\n\n${scanUrl}\n\n📱 Open on your phone\n⏰ Link expires in 24 hours\n🔒 Your photos stay on your device\n\nThank you! 🙏`;
    return waLink(phone, msg);
  },

  /** Measurement results (after completed scan) */
  measurementResults(
    phone: string,
    clientName: string,
    measurements: Record<string, number>,
    portalUrl?: string,
    lang: MessageLanguage = "english"
  ): string {
    const lines = MEASUREMENT_TYPES.filter(
      (m) => measurements[m.key] != null
    ).map((m) => `  ${m.label}: *${measurements[m.key]}"*`);

    const portal = portalUrl ? `\n\nView your measurements anytime:\n${portalUrl}` : "";

    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! ✅\n\nYour AI body measurements don ready:\n\n${lines.join("\n")}${portal}\n\nIf anything look off, just tell me make we adjust. Thank you! 🙏`
        : `Hi ${clientName}! ✅\n\nYour AI body measurements are ready:\n\n${lines.join("\n")}${portal}\n\nIf anything looks off, please let me know and we'll adjust. Thank you! 🙏`;
    return waLink(phone, msg);
  },

  /** Payment receipt (after recording payment) */
  paymentReceipt(
    phone: string,
    clientName: string,
    orderTitle: string,
    amountPaid: number,
    totalPaid: number,
    totalPrice: number,
    portalUrl?: string,
    lang: MessageLanguage = "english"
  ): string {
    const remaining = totalPrice - totalPaid;
    const bal = remaining <= 0 ? "FULLY PAID ✅" : `${amt(remaining)} remaining`;
    const portal = portalUrl ? `\n\nView your order: ${portalUrl}` : "";

    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 💰\n\nPayment Received for *${orderTitle}*:\n\nAmount: *${amt(amountPaid)}*\nTotal Paid: ${amt(totalPaid)} / ${amt(totalPrice)}\nBalance: ${bal}${portal}\n\nThank you! 🙏`
        : `Hi ${clientName},\n\nPayment received for *${orderTitle}*:\n\n💰 Amount: *${amt(amountPaid)}*\n📊 Total Paid: ${amt(totalPaid)} / ${amt(totalPrice)}\n📋 Balance: ${bal}${portal}\n\nThank you for your payment! 🙏`;
    return waLink(phone, msg);
  },

  /** Share measurement card */
  shareMeasurements(
    phone: string,
    clientName: string,
    measurementUrl: string,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 📏\n\nHere be your measurement card:\n${measurementUrl}\n\nYou fit view am anytime. 🙏`
        : `Hi ${clientName},\n\nHere's your measurement card:\n${measurementUrl}\n\nYou can view your measurements anytime using this link. 📏`;
    return waLink(phone, msg);
  },

  /** Share portal link */
  sharePortal(
    phone: string,
    clientName: string,
    portalUrl: string,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 🌐\n\nUse this link to check your orders and measurements:\n${portalUrl}\n\nYou fit check am anytime! 🙏`
        : `Hi ${clientName},\n\nHere's your client portal where you can view your orders and measurements:\n${portalUrl}\n\nYou can access it anytime. 🌐`;
    return waLink(phone, msg);
  },

  /** General message */
  general(
    phone: string,
    clientName: string,
    lang: MessageLanguage = "english"
  ): string {
    const msg = lang === "pidgin" ? `Hello ${clientName}! 👋` : `Hi ${clientName},`;
    return waLink(phone, msg);
  },

  /** Overdue payment chase */
  overdueChase(
    phone: string,
    clientName: string,
    orderTitle: string,
    balance: number,
    daysOverdue: number,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName},\n\nAbeg, your *${orderTitle}* order don pass due date by ${daysOverdue} days and e still remain *${amt(balance)}*.\n\nI wan complete your order on time. You fit make the payment today?\n\nThank you! 🙏`
        : `Hi ${clientName},\n\nI hope you're doing well. Your *${orderTitle}* order is now ${daysOverdue} days past the due date with an outstanding balance of *${amt(balance)}*.\n\nI'd love to complete your order promptly. Would you be able to make the payment today?\n\nThank you! 🙏`;
    return waLink(phone, msg);
  },

  /** CRM check-in (retention nudge) */
  checkIn(
    phone: string,
    clientName: string,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 👋\n\nLong time no see o! E don tey wey we talk — I just wan check how you dey.\n\nYou get any new outfit wey you wan make? I dey available anytime. 🙏`
        : `Hi ${clientName}! 👋\n\nIt's been a while since we connected — I just wanted to check in and see how you're doing.\n\nDo you have any upcoming events or new outfits in mind? I'd love to help! 🙏`;
    return waLink(phone, msg);
  },

  /** Gentle first payment reminder (3-6 days overdue) */
  chaseGentle(
    phone: string,
    clientName: string,
    orderTitle: string,
    balance: number,
    businessName: string,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 😊\n\nI just dey remind you small about your *${orderTitle}* order.\n\nBalance wey remain: *${amt(balance)}*\n\nYou fit pay through bank transfer or cash — just tell me which one you prefer. 🙏\n\n— ${businessName}`
        : `Hi ${clientName},\n\nJust a friendly reminder about your *${orderTitle}* order.\n\nOutstanding balance: *${amt(balance)}*\n\nYou can pay via bank transfer or cash — just let me know which works for you. 🙏\n\n— ${businessName}`;
    return waLink(phone, msg);
  },

  /** Firm second reminder (7-13 days overdue) */
  chaseFirm(
    phone: string,
    clientName: string,
    orderTitle: string,
    balance: number,
    daysOverdue: number,
    businessName: string,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName},\n\nI don reach out before about your *${orderTitle}* order. E still remain *${amt(balance)}* wey don dey outstanding for ${daysOverdue} days.\n\nAbeg, I need you to arrange the payment so we can settle this matter. The work don finish.\n\nPlease reply to confirm when you go pay. Thank you.\n\n— ${businessName}`
        : `Hello ${clientName},\n\nI have reached out previously regarding your *${orderTitle}* order. There is an outstanding balance of *${amt(balance)}* that has been pending for ${daysOverdue} days.\n\nPlease arrange payment so we can settle this matter. The work has been completed.\n\nKindly reply to confirm when payment will be made. Thank you.\n\n— ${businessName}`;
    return waLink(phone, msg);
  },

  /** Final notice (14+ days overdue) */
  chaseFinal(
    phone: string,
    clientName: string,
    orderTitle: string,
    balance: number,
    daysOverdue: number,
    businessName: string,
    lang: MessageLanguage = "english"
  ): string {
    const msg =
      lang === "pidgin"
        ? `Dear ${clientName},\n\nI don send message come your side many times about the *${amt(balance)}* balance for your *${orderTitle}* order. E don dey ${daysOverdue} days now.\n\nI need immediate payment to resolve this matter. Please contact me today.\n\nThank you.\n— ${businessName}`
        : `Dear ${clientName},\n\nDespite multiple reminders, the outstanding balance of *${amt(balance)}* for your *${orderTitle}* order remains unpaid after ${daysOverdue} days.\n\nThis is a final notice. Please contact me immediately to arrange full payment.\n\nThank you.\n— ${businessName}`;
    return waLink(phone, msg);
  },

  /** New order confirmation sent to client */
  orderConfirmed(
    phone: string,
    clientName: string,
    orderTitle: string,
    price: number,
    depositPaid: number,
    dueDate: string | undefined,
    businessName: string,
    lang: MessageLanguage = "english"
  ): string {
    const balance = price - depositPaid;
    const due = dueDate
      ? new Date(dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
      : "TBC";
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 🎉\n\nYour order don confirm!\n\n*Order:* ${orderTitle}\n*Total:* ${amt(price)}\n*Deposit paid:* ${amt(depositPaid)}\n*Balance remaining:* ${amt(balance)}\n*Ready date:* ${due}\n\nWe go keep you updated as the work progress. Thank you! 🙏\n\n— ${businessName}`
        : `Hi ${clientName},\n\nYour order has been confirmed! 🎉\n\n*Order:* ${orderTitle}\n*Total price:* ${amt(price)}\n*Deposit paid:* ${amt(depositPaid)}\n*Balance remaining:* ${amt(balance)}\n*Expected ready date:* ${due}\n\nWe will keep you updated as your order progresses. Thank you! 🙏\n\n— ${businessName}`;
    return waLink(phone, msg);
  },

  /** Wraps arbitrary pre-composed text (e.g. AI-generated messages) into a
   *  wa.me link, reusing the same phone-cleaning logic as every other
   *  template above. Used by AI Quotation Generator and future AI features
   *  that produce free-form copy rather than a fixed template. */
  custom(phone: string, message: string): string {
    return waLink(phone, message);
  },

  /** Payment link share message */
  paymentRequest(
    phone: string,
    clientName: string,
    label: string,
    amount: number,
    url: string,
    businessName: string,
    currency: string = "NGN",
    lang: MessageLanguage = "english"
  ): string {
    const symbol = currency === "NGN" ? "₦" : currency + " ";
    const amtStr = `${symbol}${Math.round(amount).toLocaleString()}`;
    const msg =
      lang === "pidgin"
        ? `Hello ${clientName}! 👋\n\n${label}: *${amtStr}*\n\nUse this link to pay — you go see my account details there:\n${url}\n\nThank you! 🙏\n\n— ${businessName}`
        : `Hi ${clientName},\n\nHere's your payment request — *${label}: ${amtStr}*.\n\nPay directly using this link (shows my account details):\n${url}\n\nThank you! 🙏\n\n— ${businessName}`;
    return waLink(phone, msg);
  },
};

