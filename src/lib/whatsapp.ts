/* -------------------------------------------------------------------------- */
/*  WhatsApp Deep Link Generator                                              */
/*  Creates wa.me links with pre-filled messages for common designer actions */
/* -------------------------------------------------------------------------- */

function cleanPhone(phone: string): string {
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-()]+/g, "");
  // Convert Nigerian local format to international
  if (cleaned.startsWith("0")) {
    cleaned = "234" + cleaned.slice(1);
  }
  // Remove leading + if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

function waLink(phone: string, message: string): string {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export const whatsapp = {
  /** Order is ready for pickup */
  orderReady(phone: string, clientName: string, orderTitle: string): string {
    return waLink(
      phone,
      `Hi ${clientName}! Great news - your order "${orderTitle}" is ready for pickup. Please let me know a convenient time to collect it. Thank you! - Stitcha`
    );
  },

  /** Payment reminder */
  paymentReminder(
    phone: string,
    clientName: string,
    orderTitle: string,
    balance: number
  ): string {
    return waLink(
      phone,
      `Hi ${clientName}, this is a friendly reminder about the outstanding balance of \u20A6${balance.toLocaleString()} for your order "${orderTitle}". Please let me know if you'd like to arrange payment. Thank you!`
    );
  },

  /** Order status update */
  statusUpdate(
    phone: string,
    clientName: string,
    orderTitle: string,
    status: string
  ): string {
    return waLink(
      phone,
      `Hi ${clientName}! Just updating you - your order "${orderTitle}" is now in the "${status}" stage. I'll keep you posted on the progress. Thank you for your patience!`
    );
  },

  /** Fitting appointment */
  fittingInvite(phone: string, clientName: string, orderTitle: string): string {
    return waLink(
      phone,
      `Hi ${clientName}! Your order "${orderTitle}" is ready for a fitting. Could you please let me know when you're available to come in? Looking forward to seeing you!`
    );
  },

  /** Share measurement card */
  shareMeasurements(phone: string, clientName: string, measurementUrl: string): string {
    return waLink(
      phone,
      `Hi ${clientName}! Here are your body measurements on your personal measurement card:\n${measurementUrl}\n\nYou can access this anytime. Let me know if you have any questions!`
    );
  },

  /** Share portal link */
  sharePortal(phone: string, clientName: string, portalUrl: string): string {
    return waLink(
      phone,
      `Hi ${clientName}! Here's your personal client portal where you can view your measurements and track orders:\n${portalUrl}\n\nCheck it out anytime!`
    );
  },

  /** General message */
  general(phone: string, clientName: string): string {
    return waLink(phone, `Hi ${clientName}! `);
  },
};
