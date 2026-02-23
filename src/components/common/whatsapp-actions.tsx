"use client";

import { useState } from "react";
import { MessageCircle, Send, CreditCard, Scissors, Shirt, Share2, X } from "lucide-react";
import { whatsapp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface WhatsAppAction {
  label: string;
  icon: React.ReactNode;
  url: string;
}

interface WhatsAppActionsProps {
  phone: string;
  clientName: string;
  /** Order context for order-specific actions */
  order?: {
    title: string;
    status: string;
    balance: number;
  };
  /** URL for sharing measurements */
  measurementUrl?: string;
  /** URL for sharing portal */
  portalUrl?: string;
  /** Compact mode - just the button */
  compact?: boolean;
}

export function WhatsAppActions({
  phone,
  clientName,
  order,
  measurementUrl,
  portalUrl,
  compact,
}: WhatsAppActionsProps) {
  const [open, setOpen] = useState(false);

  const actions: WhatsAppAction[] = [];

  // Order-specific actions
  if (order) {
    if (order.balance > 0) {
      actions.push({
        label: "Payment Reminder",
        icon: <CreditCard className="h-3.5 w-3.5" />,
        url: whatsapp.paymentReminder(phone, clientName, order.title, order.balance),
      });
    }
    actions.push({
      label: "Status Update",
      icon: <Shirt className="h-3.5 w-3.5" />,
      url: whatsapp.statusUpdate(phone, clientName, order.title, order.status),
    });
    if (["sewing", "finishing"].includes(order.status)) {
      actions.push({
        label: "Fitting Invite",
        icon: <Scissors className="h-3.5 w-3.5" />,
        url: whatsapp.fittingInvite(phone, clientName, order.title),
      });
    }
    if (["ready"].includes(order.status)) {
      actions.push({
        label: "Ready for Pickup",
        icon: <Send className="h-3.5 w-3.5" />,
        url: whatsapp.orderReady(phone, clientName, order.title),
      });
    }
  }

  // Sharing actions
  if (measurementUrl) {
    actions.push({
      label: "Share Measurements",
      icon: <Share2 className="h-3.5 w-3.5" />,
      url: whatsapp.shareMeasurements(phone, clientName, measurementUrl),
    });
  }
  if (portalUrl) {
    actions.push({
      label: "Share Portal",
      icon: <Share2 className="h-3.5 w-3.5" />,
      url: whatsapp.sharePortal(phone, clientName, portalUrl),
    });
  }

  // Always show general message
  actions.push({
    label: "Send Message",
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    url: whatsapp.general(phone, clientName),
  });

  if (compact || actions.length <= 1) {
    return (
      <a
        href={actions[0]?.url || whatsapp.general(phone, clientName)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/10 px-3 py-2 text-xs font-medium text-[#25D366] transition-all hover:bg-[#25D366]/20"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/10 px-3 py-2 text-xs font-medium text-[#25D366] transition-all hover:bg-[#25D366]/20"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-[#1A1A2E]/8 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[#1A1A2E]/6 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1A1A2E]/35">
                Quick Actions
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-[#1A1A2E]/30 hover:text-[#1A1A2E]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="py-1">
              {actions.map((action) => (
                <a
                  key={action.label}
                  href={action.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-xs text-[#1A1A2E]/70",
                    "transition-colors hover:bg-[#25D366]/5 hover:text-[#25D366]"
                  )}
                >
                  {action.icon}
                  {action.label}
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
