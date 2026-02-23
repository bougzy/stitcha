"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  FileDown,
  Package,
  Ruler,
  Shirt,
  StickyNote,
  Trash2,
  User,
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
import { ORDER_STATUSES, MEASUREMENT_TYPES } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Order, OrderStatus, Measurements } from "@/types";

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
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

      toast.success(`Status updated to ${ORDER_STATUSES.find((s) => s.value === newStatus)?.label || newStatus}`);
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
                onClick={() => router.push(`/orders/new?edit=${order._id}`)}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
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

          {/* Financial section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <GlassCard padding="lg" className="h-full">
              <div className="mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#D4A853]" />
                <h2 className="text-lg font-semibold text-[#1A1A2E]">
                  Payment
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[#C75B39]/5 px-4 py-3">
                  <span className="text-xs font-medium text-[#1A1A2E]/55">
                    Total Price
                  </span>
                  <span className="text-lg font-bold text-[#1A1A2E]">
                    {formatCurrency(order.price)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 px-4 py-3">
                  <span className="text-xs font-medium text-[#1A1A2E]/55">
                    Deposit Paid
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
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
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
      </div>
    </PageTransition>
  );
}
