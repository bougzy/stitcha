"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  FileDown,
  Package,
  Plus,
  Ruler,
  Shirt,
  Smartphone,
  StickyNote,
  Trash2,
  User,
  Camera,
  ImageIcon,
  Wallet,
  X,
  MessageCircle,
  AlertTriangle,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/page-transition";
import { GlassCard } from "@/components/common/glass-card";
import { SectionLoader } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusProgress } from "@/components/orders/status-progress";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { WhatsAppActions } from "@/components/common/whatsapp-actions";
import { ORDER_STATUSES, MEASUREMENT_TYPES } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { whatsapp, type MessageLanguage } from "@/lib/whatsapp";
import type { Order, OrderStatus, Measurements, Payment, PaymentMethod } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Status badge helper                                                       */
/* -------------------------------------------------------------------------- */

function getStatusBadgeVariant(
  status: OrderStatus
): "default" | "secondary" | "outline" | "destructive" | "success" | "warning" {
  const statusConfig = ORDER_STATUSES.find((s) => s.value === status);
  if (!statusConfig) return "outline";

  switch (statusConfig.color) {
    case "gold":
      return "warning";
    case "info":
      return "secondary";
    case "terracotta":
      return "default";
    case "success":
      return "success";
    case "destructive":
      return "destructive";
    default:
      return "outline";
  }
}

/* -------------------------------------------------------------------------- */
/*  Due date helpers                                                          */
/* -------------------------------------------------------------------------- */

function getDueDateCountdown(dueDate?: string) {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`,
      urgent: true,
      overdue: true,
    };
  }
  if (diffDays === 0) {
    return { text: "Due today", urgent: true, overdue: false };
  }
  return {
    text: `${diffDays} day${diffDays !== 1 ? "s" : ""} remaining`,
    urgent: diffDays <= 3,
    overdue: false,
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const orderId = params.id as string;

  // Role-based access control ("Oga Protocol")
  const userRole = (session?.user as Record<string, unknown>)?.role as string || "owner";
  const isOwner = userRole === "owner";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [receiptPrompt, setReceiptPrompt] = useState<{
    amount: number;
    newTotalPaid: number;
  } | null>(null);

  /* ---- Fetch order ---- */
  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to fetch order");
      }

      setOrder(json.data);
      setNewStatus(json.data.status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load order");
      router.push("/orders");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  /* ---- Update status ---- */
  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === order?.status) {
      setStatusDialogOpen(false);
      return;
    }

    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to update status");
      }

      toast.success(`Status updated to ${ORDER_STATUSES.find((s) => s.value === newStatus)?.label || newStatus}`, {
        action: order?.client?.phone
          ? {
              label: "Notify on WhatsApp",
              onClick: () => {
                const url = whatsapp.statusUpdate(
                  order.client!.phone,
                  order.client!.name,
                  order.title,
                  newStatus,
                  order.dueDate
                );
                window.open(url, "_blank");
              },
            }
          : undefined,
      });
      setStatusDialogOpen(false);
      fetchOrder();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  /* ---- Delete order ---- */
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to delete order");
      }

      toast.success("Order deleted successfully");
      router.push("/orders");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete order"
      );
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Generate invoice ---- */
  const generateInvoice = () => {
    if (!order) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(28);
    doc.setTextColor(199, 91, 57); // #C75B39
    doc.text("INVOICE", 20, 30);

    doc.setFontSize(10);
    doc.setTextColor(26, 26, 46); // #1A1A2E
    doc.text("Generated by Stitcha", 20, 38);

    // Date
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`, pageWidth - 20, 30, { align: "right" });
    doc.text(`Order ID: ${order._id}`, pageWidth - 20, 37, { align: "right" });

    // Divider
    doc.setDrawColor(199, 91, 57);
    doc.setLineWidth(0.5);
    doc.line(20, 44, pageWidth - 20, 44);

    // Client details
    let yPos = 56;
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 46);
    doc.setFont("helvetica", "bold");
    doc.text("Client Details", 20, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (order.client?.name) {
      doc.text(`Name: ${order.client.name}`, 20, yPos);
      yPos += 6;
    }
    if (order.client?.phone) {
      doc.text(`Phone: ${order.client.phone}`, 20, yPos);
      yPos += 6;
    }

    // Order details
    yPos += 6;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Order Details", 20, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Title: ${order.title}`, 20, yPos);
    yPos += 6;
    doc.text(`Garment Type: ${order.garmentType}`, 20, yPos);
    yPos += 6;
    if (order.fabric) {
      doc.text(`Fabric: ${order.fabric}`, 20, yPos);
      yPos += 6;
    }
    if (order.dueDate) {
      doc.text(`Due Date: ${new Date(order.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`, 20, yPos);
      yPos += 6;
    }

    // Pricing table
    yPos += 8;
    autoTable(doc, {
      startY: yPos,
      head: [["Description", "Amount"]],
      body: [
        ["Total Price", formatCurrency(order.price)],
        ["Deposit Paid", formatCurrency(order.depositPaid || 0)],
        ["Balance Due", formatCurrency(order.price - (order.depositPaid || 0))],
      ],
      theme: "striped",
      headStyles: {
        fillColor: [199, 91, 57],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [26, 26, 46],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 248],
      },
      margin: { left: 20, right: 20 },
      columnStyles: {
        1: { halign: "right" },
      },
    });

    // Notes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 40;
    if (order.notes) {
      const notesY = finalY + 12;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 26, 46);
      doc.text("Notes", 20, notesY);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const splitNotes = doc.splitTextToSize(order.notes, pageWidth - 40);
      doc.text(splitNotes, 20, notesY + 8);
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(212, 168, 83); // #D4A853
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by Stitcha", pageWidth / 2, pageHeight - 12, { align: "center" });

    // Download
    const fileName = `invoice-${order.title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`;
    doc.save(fileName);
  };

  /* ---- Generate payment receipt ---- */
  const generateReceipt = () => {
    if (!order || !order.payments?.length) {
      toast.error("No payments recorded yet");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(28);
    doc.setTextColor(22, 163, 74); // Green
    doc.text("RECEIPT", 20, 30);

    doc.setFontSize(10);
    doc.setTextColor(26, 26, 46);
    doc.text("Payment Receipt — Stitcha", 20, 38);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Date: ${new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}`,
      pageWidth - 20,
      30,
      { align: "right" }
    );

    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(0.5);
    doc.line(20, 44, pageWidth - 20, 44);

    // Client
    let yPos = 56;
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 46);
    doc.setFont("helvetica", "bold");
    doc.text("Received From", 20, yPos);
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (order.client?.name) {
      doc.text(order.client.name, 20, yPos);
      yPos += 6;
    }
    if (order.client?.phone) {
      doc.text(order.client.phone, 20, yPos);
      yPos += 6;
    }

    // Order info
    yPos += 6;
    doc.setFontSize(9);
    doc.text(`Order: ${order.title}`, 20, yPos);
    yPos += 6;
    doc.text(`Garment: ${order.garmentType}`, 20, yPos);
    yPos += 10;

    // Payment table
    const paymentRows = order.payments.map(
      (p: { amount: number; method: string; paidAt: string; note?: string }) => [
        new Date(p.paidAt).toLocaleDateString("en-NG"),
        formatCurrency(p.amount),
        p.method.replace("_", " "),
        p.note || "-",
      ]
    );

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Amount", "Method", "Note"]],
      body: paymentRows,
      theme: "striped",
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 8, textColor: [26, 26, 46] },
      margin: { left: 20, right: 20 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 40;

    // Summary
    const summaryY = finalY + 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Paid: ${formatCurrency(order.depositPaid || 0)}`, 20, summaryY);
    doc.text(
      `Balance: ${formatCurrency(order.price - (order.depositPaid || 0))}`,
      20,
      summaryY + 7
    );

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by Stitcha", pageWidth / 2, pageHeight - 12, { align: "center" });

    doc.save(`receipt-${order.title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`);
  };

  /* ---- Record payment ---- */
  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      setRecordingPayment(true);
      const res = await fetch(`/api/orders/${orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: paymentMethod,
          note: paymentNote || undefined,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to record payment");
      }

      // Blind Receipting: staff sees only "Payment recorded", no balance info
      const newTotalPaid = isOwner ? (order?.depositPaid || 0) + amount : 0;
      toast.success(
        isOwner
          ? `Payment of ${formatCurrency(amount)} recorded`
          : `Payment of ${formatCurrency(amount)} recorded successfully`
      );
      setShowPaymentForm(false);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentNote("");
      fetchOrder();

      // Force receipt prompt — designer MUST acknowledge
      if (order?.client?.phone) {
        setReceiptPrompt({ amount, newTotalPaid });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const res = await fetch(
        `/api/orders/${orderId}/payments?paymentId=${paymentId}`,
        { method: "DELETE" }
      );
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to remove payment");
      }

      toast.success("Payment removed");
      fetchOrder();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove payment");
    }
  };

  /* ---- Request correction (staff only) ---- */
  const handleRequestCorrection = async () => {
    if (!correctionReason.trim()) {
      toast.error("Please describe what needs to be corrected");
      return;
    }

    try {
      setSubmittingCorrection(true);
      const res = await fetch(`/api/orders/${orderId}/correction-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: correctionReason,
          type: "order_correction",
        }),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to submit request");
      }

      toast.success("Correction request sent to account owner");
      setCorrectionDialogOpen(false);
      setCorrectionReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmittingCorrection(false);
    }
  };

  /* ---- Gallery upload ---- */
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500_000) {
      toast.error("Image too large. Max 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/gallery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: reader.result }),
        });
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error);
        }

        toast.success("Photo added to gallery");
        fetchOrder();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleGalleryDelete = async (index: number) => {
    try {
      const res = await fetch(
        `/api/orders/${orderId}/gallery?index=${index}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Photo removed");
      fetchOrder();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <PageTransition>
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-[#1A1A2E]/8" />
            <div className="h-6 w-48 animate-pulse rounded bg-[#1A1A2E]/8" />
          </div>
          <SectionLoader lines={4} />
          <SectionLoader lines={3} />
          <SectionLoader lines={5} />
        </div>
      </PageTransition>
    );
  }

  if (!order) return null;

  const dueDateInfo = getDueDateCountdown(order.dueDate);
  const balance = order.price - (order.depositPaid || 0);
  const clientMeasurements = order.client?.measurements as Measurements | undefined;

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        {/* Back button */}
        <button
          onClick={() => router.push("/orders")}
          className="flex items-center gap-2 text-sm text-[#1A1A2E]/55 transition-colors hover:text-[#1A1A2E]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </button>

        {/* Order header */}
        <GlassCard padding="lg" gradientBorder>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#1A1A2E]">
                  {order.title}
                </h1>
                <Badge
                  variant={getStatusBadgeVariant(order.status)}
                  className="capitalize"
                >
                  {ORDER_STATUSES.find((s) => s.value === order.status)?.label ||
                    order.status}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#1A1A2E]/55">
                <span className="flex items-center gap-1.5">
                  <Shirt className="h-4 w-4" />
                  {order.garmentType}
                </span>
                {order.dueDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDate(order.dueDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusDialogOpen(true)}
              >
                <Package className="h-3.5 w-3.5" />
                Update Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateInvoice}
              >
                <FileDown className="h-3.5 w-3.5" />
                Invoice
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateReceipt}
              >
                <FileDown className="h-3.5 w-3.5" />
                Receipt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/orders/new?edit=${order._id}`)}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              {isOwner ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-600 hover:bg-amber-50"
                  onClick={() => setCorrectionDialogOpen(true)}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Request Correction
                </Button>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Status progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard padding="lg">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-[#C75B39]" />
              <h2 className="text-lg font-semibold text-[#1A1A2E]">
                Order Progress
              </h2>
            </div>
            <StatusProgress status={order.status} />

            {/* Order Timeline */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="mt-5 border-t border-[#1A1A2E]/6 pt-4">
                <p className="mb-3 text-xs font-semibold text-[#1A1A2E]/40">
                  Status History
                </p>
                <OrderTimeline
                  history={order.statusHistory}
                  currentStatus={order.status}
                />
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Client info card */}
        {order.client && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <GlassCard padding="lg" hover>
              <div
                className="cursor-pointer"
                onClick={() => router.push(`/clients/${order.clientId}`)}
              >
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#D4A853]" />
                  <h2 className="text-lg font-semibold text-[#1A1A2E]">
                    Client
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      "text-sm font-bold text-white",
                      order.client.gender === "female"
                        ? "bg-gradient-to-br from-[#C75B39] to-[#D4A853]"
                        : "bg-gradient-to-br from-[#1A1A2E] to-[#C75B39]"
                    )}
                  >
                    {order.client.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">
                      {order.client.name}
                    </p>
                    {order.client.phone && (
                      <p className="text-xs text-[#1A1A2E]/50">
                        {order.client.phone}
                      </p>
                    )}
                  </div>
                  {/* WhatsApp actions */}
                  {order.client.phone && (
                    <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                      <WhatsAppActions
                        phone={order.client.phone}
                        clientName={order.client.name}
                        order={{
                          title: order.title,
                          status: order.status,
                          balance,
                          dueDate: order.dueDate,
                          totalPaid: order.depositPaid || 0,
                          totalPrice: order.price,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Order details grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Order details */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard padding="lg" className="h-full">
              <div className="mb-4 flex items-center gap-2">
                <Shirt className="h-5 w-5 text-[#C75B39]" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Order Details
                </h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-[#1A1A2E]/45">
                    Garment Type
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[#1A1A2E]">
                    {order.garmentType}
                  </p>
                </div>
                {order.fabric && (
                  <div>
                    <p className="text-xs font-medium text-[#1A1A2E]/45">
                      Fabric
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[#1A1A2E]">
                      {order.fabric}
                    </p>
                  </div>
                )}
                {order.description && (
                  <div>
                    <p className="text-xs font-medium text-[#1A1A2E]/45">
                      Description
                    </p>
                    <p className="mt-0.5 text-sm text-[#1A1A2E]/70 leading-relaxed">
                      {order.description}
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Financial section with payment tracker */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <GlassCard padding="lg" className="h-full">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#D4A853]" />
                  <h2 className="text-lg font-semibold text-[#1A1A2E]">
                    Payment
                  </h2>
                </div>
                {order.paymentStatus && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      order.paymentStatus === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : order.paymentStatus === "partial"
                        ? "bg-amber-100 text-amber-700"
                        : order.paymentStatus === "overdue"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {order.paymentStatus}
                  </span>
                )}
              </div>

              {/* Summary — Blind Receipting: staff only sees price, not balance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-[#C75B39]/5 px-4 py-3">
                  <span className="text-xs font-medium text-[#1A1A2E]/55">
                    Total Price
                  </span>
                  <span className="text-lg font-bold text-[#1A1A2E]">
                    {formatCurrency(order.price)}
                  </span>
                </div>
                {isOwner ? (
                  <>
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 px-4 py-3">
                      <span className="text-xs font-medium text-[#1A1A2E]/55">
                        Total Paid
                      </span>
                      <span className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(order.depositPaid || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-[#D4A853]/10 px-4 py-3">
                      <span className="text-xs font-medium text-[#1A1A2E]/55">
                        Balance
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          balance > 0 ? "text-[#C75B39]" : "text-emerald-600"
                        )}
                      >
                        {balance <= 0 ? (
                          <span className="flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Paid in full
                          </span>
                        ) : (
                          formatCurrency(balance)
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-[#1A1A2E]/3 px-4 py-3">
                    <Lock className="h-4 w-4 text-[#1A1A2E]/30" />
                    <span className="text-xs font-medium text-[#1A1A2E]/45">
                      Balance details visible to account owner only
                    </span>
                  </div>
                )}

                {/* Progress bar — only visible to owner */}
                {isOwner && (
                  <div className="pt-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#1A1A2E]/6">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          balance <= 0
                            ? "bg-emerald-500"
                            : (order.depositPaid || 0) > 0
                            ? "bg-[#D4A853]"
                            : "bg-[#1A1A2E]/10"
                        )}
                        style={{
                          width: `${Math.min(100, ((order.depositPaid || 0) / order.price) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-[#1A1A2E]/35">
                      {Math.round(((order.depositPaid || 0) / order.price) * 100)}% paid
                    </p>
                  </div>
                )}
              </div>

              {/* Payment history */}
              {order.payments && order.payments.length > 0 && (
                <div className="mt-4 border-t border-[#1A1A2E]/6 pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#1A1A2E]/35">
                    Payment History
                  </p>
                  <div className="space-y-1.5">
                    {order.payments.map((p: Payment, i: number) => (
                      <div
                        key={p._id || i}
                        className="group flex items-center gap-2 rounded-lg bg-white/50 px-3 py-2"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          {p.method === "cash" ? (
                            <Banknote className="h-3.5 w-3.5" />
                          ) : p.method === "bank_transfer" ? (
                            <Wallet className="h-3.5 w-3.5" />
                          ) : p.method === "card" ? (
                            <CreditCard className="h-3.5 w-3.5" />
                          ) : p.method === "mobile_money" ? (
                            <Smartphone className="h-3.5 w-3.5" />
                          ) : (
                            <DollarSign className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#1A1A2E]">
                            {formatCurrency(p.amount)}
                          </p>
                          <p className="text-[10px] text-[#1A1A2E]/40">
                            {p.method.replace("_", " ")} &middot;{" "}
                            {new Date(p.paidAt).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            {p.note && ` — ${p.note}`}
                          </p>
                        </div>
                        {/* Zero-delete: only owners can remove payments */}
                        {isOwner && (
                          <button
                            onClick={() => p._id && handleDeletePayment(p._id)}
                            className="shrink-0 rounded p-1 text-[#1A1A2E]/20 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                            title="Remove payment"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add payment form */}
              {balance > 0 && (
                <div className="mt-4 border-t border-[#1A1A2E]/6 pt-3">
                  {showPaymentForm ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="mb-1 block text-[10px] font-medium text-[#1A1A2E]/45">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={`Max: ${formatCurrency(balance)}`}
                            className="w-full rounded-lg border border-[#1A1A2E]/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-[10px] font-medium text-[#1A1A2E]/45">
                            Method
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                            className="w-full rounded-lg border border-[#1A1A2E]/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#D4A853]/40"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="card">Card</option>
                            <option value="mobile_money">Mobile Money</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="w-full rounded-lg border border-[#1A1A2E]/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={handleRecordPayment}
                          loading={recordingPayment}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Record Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowPaymentForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPaymentForm(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#D4A853]/30 px-3 py-2.5 text-xs font-medium text-[#D4A853] transition-all hover:border-[#D4A853]/50 hover:bg-[#D4A853]/5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Record Payment
                    </button>
                  )}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Due date section */}
        {order.dueDate && dueDateInfo && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard padding="lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#1A1A2E]/40" />
                  <h2 className="text-lg font-semibold text-[#1A1A2E]">
                    Due Date
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#1A1A2E]">
                    {formatDate(order.dueDate)}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      dueDateInfo.overdue
                        ? "text-red-500"
                        : dueDateInfo.urgent
                        ? "text-[#D4A853]"
                        : "text-[#1A1A2E]/45"
                    )}
                  >
                    {dueDateInfo.text}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Measurements section */}
        {clientMeasurements && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <GlassCard padding="lg">
              <div className="mb-4 flex items-center gap-2">
                <Ruler className="h-5 w-5 text-[#C75B39]" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Client Measurements
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {MEASUREMENT_TYPES.map((type) => {
                  const value =
                    clientMeasurements[type.key as keyof Measurements] as
                      | number
                      | undefined;
                  if (!value) return null;
                  return (
                    <div
                      key={type.key}
                      className="rounded-xl border border-white/30 bg-white/30 px-3 py-2.5"
                    >
                      <p className="text-[11px] font-medium text-[#1A1A2E]/45">
                        {type.label}
                      </p>
                      <p className="mt-0.5 text-base font-semibold text-[#1A1A2E]">
                        {value}{" "}
                        <span className="text-[10px] font-normal text-[#1A1A2E]/35">
                          {type.unit}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Gallery section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
        >
          <GlassCard padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-[#C75B39]" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Gallery
                </h2>
                {order.gallery && order.gallery.length > 0 && (
                  <span className="text-xs text-[#1A1A2E]/35">
                    {order.gallery.length}/6
                  </span>
                )}
              </div>
              {(!order.gallery || order.gallery.length < 6) && (
                <label className="cursor-pointer rounded-lg border border-dashed border-[#C75B39]/30 px-3 py-1.5 text-xs font-medium text-[#C75B39] transition-all hover:border-[#C75B39]/50 hover:bg-[#C75B39]/5">
                  <Plus className="mr-1 inline h-3 w-3" />
                  Add Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGalleryUpload}
                  />
                </label>
              )}
            </div>

            {order.gallery && order.gallery.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {order.gallery.map((img, i) => (
                  <div
                    key={i}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-[#1A1A2E]/5"
                  >
                    <img
                      src={img}
                      alt={`${order.title} - ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => handleGalleryDelete(i)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1A1A2E]/10 py-8">
                <ImageIcon className="h-8 w-8 text-[#1A1A2E]/15" />
                <p className="mt-2 text-xs text-[#1A1A2E]/35">
                  Add photos of the garment at different stages
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Notes section */}
        {order.notes && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard padding="lg">
              <div className="mb-3 flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-[#1A1A2E]/40" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">Notes</h2>
              </div>
              <p className="text-sm leading-relaxed text-[#1A1A2E]/60">
                {order.notes}
              </p>
            </GlassCard>
          </motion.div>
        )}

        {/* Update status dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogClose />
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change the current status of this order to reflect its progress.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Select
                label="New Status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                options={ORDER_STATUSES.map((s) => ({
                  value: s.value,
                  label: s.label,
                }))}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setStatusDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStatus}
                loading={updatingStatus}
                disabled={newStatus === order.status}
              >
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogClose />
            <DialogHeader>
              <DialogTitle>Delete Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{order.title}&quot;? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                loading={deleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Receipt Enforcement Dialog — appears after every payment */}
        {/* Staff MUST send receipt (Forced External Audit) — no skip option */}
        <Dialog
          open={!!receiptPrompt}
          onOpenChange={(open) => {
            // Staff cannot dismiss this dialog without sending the receipt
            if (!open && !isOwner) return;
            if (!open) setReceiptPrompt(null);
          }}
        >
          <DialogContent>
            {/* Only owners can close this dialog manually */}
            {isOwner && <DialogClose />}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                {isOwner ? "Send Payment Receipt" : "Send Receipt to Continue"}
              </DialogTitle>
              <DialogDescription>
                {isOwner
                  ? "A WhatsApp receipt builds trust and serves as proof of payment. Always send receipts to protect both you and your client."
                  : "You MUST send a WhatsApp receipt before continuing. This creates an external audit trail that protects you and the business."
                }
              </DialogDescription>
            </DialogHeader>
            {receiptPrompt && order.client?.phone && (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-green-50/50 px-4 py-3">
                  <p className="text-sm font-semibold text-green-700">
                    {formatCurrency(receiptPrompt.amount)} received from {order.client?.name}
                  </p>
                  {/* Blind Receipting: only owners see balance breakdown */}
                  {isOwner ? (
                    <p className="text-xs text-green-600/70 mt-0.5">
                      Total paid: {formatCurrency(receiptPrompt.newTotalPaid)} / {formatCurrency(order.price)}
                    </p>
                  ) : (
                    <p className="text-xs text-green-600/70 mt-0.5">
                      Payment recorded — send receipt to confirm
                    </p>
                  )}
                </div>

                {/* Staff sees a warning that they can't skip */}
                {!isOwner && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-[11px] text-amber-700">
                      Sending a receipt is mandatory for staff. This protects you and the Oga.
                    </p>
                  </div>
                )}

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      const url = whatsapp.paymentReceipt(
                        order.client!.phone,
                        order.client!.name,
                        order.title,
                        receiptPrompt.amount,
                        isOwner ? receiptPrompt.newTotalPaid : receiptPrompt.amount,
                        isOwner ? order.price : receiptPrompt.amount
                      );
                      window.open(url, "_blank");
                      // Mark receipt as sent
                      fetch(`/api/orders/${orderId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ receiptSent: true }),
                      });
                      setReceiptPrompt(null);
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Send Receipt via WhatsApp
                  </Button>
                  {/* Only owners can skip — staff MUST send */}
                  {isOwner && (
                    <button
                      onClick={() => {
                        toast.warning("Receipt not sent — flagged for follow-up", {
                          description: "Skipping receipts may cause payment disputes",
                        });
                        setReceiptPrompt(null);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Skip Receipt (Not Recommended)
                    </button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Correction Request Dialog — staff only */}
        <Dialog open={correctionDialogOpen} onOpenChange={setCorrectionDialogOpen}>
          <DialogContent>
            <DialogClose />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Request Correction
              </DialogTitle>
              <DialogDescription>
                Describe what needs to be corrected. The account owner (Oga)
                will review and take action.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-amber-50/50 border border-amber-200 px-4 py-3">
                <p className="text-xs text-amber-700">
                  Staff accounts cannot delete or modify critical order data.
                  All correction requests are logged for accountability.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1A1A2E]/55">
                  What needs to be corrected?
                </label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g., Wrong payment amount recorded, need to remove duplicate entry..."
                  rows={3}
                  className="w-full rounded-lg border border-[#1A1A2E]/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[#D4A853]/40 focus:ring-1 focus:ring-[#D4A853]/20 placeholder:text-[#1A1A2E]/30"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCorrectionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestCorrection}
                  loading={submittingCorrection}
                  disabled={!correctionReason.trim()}
                  className="gap-2"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Submit Request
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
