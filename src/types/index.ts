export type DesignerRole = "owner" | "manager" | "apprentice" | "admin";

export interface LifetimeCounts {
  totalClientsCreated: number;
  totalScansUsed: number;
  totalOrdersCreated: number;
}

export interface Designer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  country: string;
  bio?: string;
  avatar?: string;
  specialties: string[];
  subscription: "free" | "pro" | "business";
  subscriptionExpiry?: string;
  paystackCustomerId?: string;
  role: DesignerRole;
  teamOwnerId?: string;
  lifetimeCounts: LifetimeCounts;
  isOnboarded: boolean;
  isVerified: boolean;
  publicProfile: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  _id: string;
  designerId: string;
  action: string;
  entity: "client" | "order" | "payment" | "measurement" | "settings";
  entityId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface Client {
  _id: string;
  designerId: string;
  name: string;
  email?: string;
  phone: string;
  gender: "male" | "female";
  notes?: string;
  measurements?: Measurements;
  lastMeasuredAt?: string;
  scanLink?: string;
  shareCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Measurements {
  bust?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  armLength?: number;
  inseam?: number;
  neck?: number;
  chest?: number;
  backLength?: number;
  frontLength?: number;
  sleeveLength?: number;
  wrist?: number;
  thigh?: number;
  knee?: number;
  calf?: number;
  ankle?: number;
  height?: number;
  weight?: number;
  source: "manual" | "ai_scan";
  confidence?: number;
  measuredAt: string;
  reviewedByDesigner?: boolean;
  reviewedAt?: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  changedAt: string;
  note?: string;
}

export type PaymentMethod = "cash" | "bank_transfer" | "card" | "mobile_money" | "other";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "overdue";

export interface Payment {
  _id?: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
  paidAt: string;
}

export interface Order {
  _id: string;
  designerId: string;
  clientId: string;
  client?: Client;
  title: string;
  description?: string;
  status: OrderStatus;
  statusHistory?: StatusHistoryEntry[];
  garmentType: string;
  fabric?: string;
  fabricImages?: string[];
  price: number;
  currency: string;
  depositPaid: number;
  payments?: Payment[];
  paymentStatus?: PaymentStatus;
  gallery?: string[];
  dueDate?: string;
  measurements?: Measurements;
  notes?: string;
  images?: string[];
  isDeleted?: boolean;
  deletedAt?: string;
  receiptSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "cutting"
  | "sewing"
  | "fitting"
  | "finishing"
  | "ready"
  | "delivered"
  | "cancelled";

export interface ScanSession {
  _id: string;
  designerId: string;
  clientId: string;
  linkCode: string;
  status: "pending" | "processing" | "completed" | "failed" | "expired";
  measurements?: Measurements;
  expiresAt: string;
  createdAt: string;
}

export interface RevenueTrendItem {
  month: string;
  revenue: number;
  collected: number;
  orders: number;
}

export interface GarmentBreakdownItem {
  type: string;
  count: number;
  revenue: number;
}

export interface DashboardStats {
  totalClients: number;
  totalOrders: number;
  activeOrders: number;
  revenue: number;
  scansThisMonth: number;
  recentClients: Client[];
  recentOrders: (Order & { client?: { name?: string; phone?: string } | null })[];
  ordersByStatus: Record<string, number>;
  revenueTrend?: RevenueTrendItem[];
  garments?: GarmentBreakdownItem[];
  paymentBreakdown?: Record<string, { count: number; total: number }>;
  receivables?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
