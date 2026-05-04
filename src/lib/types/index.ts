import type { Timestamp } from "firebase/firestore";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "sales" | "admin" | "superadmin";
  isActive: boolean;
  teamName?: string;
  programTrack?: string;
  addedAt: Timestamp;
  addedBy?: string;
  lastLogin?: Timestamp;
}

export interface Ad {
  id: string;
  name: string;
  postLink: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface FunnelEntry {
  adName: string;
  adId?: string;
  count: number;
  notes?: string;
  leadNotes?: string[];
}

export interface SalesFunnel {
  noReplyAfterGreeting: FunnelEntry[];
  noReplyAfterDetails: FunnelEntry[];
  noReplyAfterPrice: FunnelEntry[];
  repliedAfterPrice: FunnelEntry[];
}

export interface RejectionReason {
  rawText: string;
  count: number;
  category: string;
}

export interface Objection {
  id: string;
  text: string;
  count: number;
}

export interface ParsedDeal {
  customerName: string;
  adSource: string;
  programName: string;
  programCount: number;
  dealValue: number;
  firstContactDate: string;
  contactAttempts?: number;
  dealCategory?: "core" | "side";
  products?: string[];
  bookingType?: "self_booking" | "call_booking";
  closureType?: "call" | "self"; // legacy compatibility
}

export interface ParsedReportData {
  totalMessages: number;
  interactions: number;
  conversionRate: number;
  jobConfusionCount: number;
  funnel: SalesFunnel;
  rejectionReasons: RejectionReason[];
  closedDeals: ParsedDeal[];
  messagesCount?: number;
  commentsCount?: number;
  commentsFunnel?: SalesFunnel;
  specialCases?: string[];
  detectedJobs?: Array<Record<string, unknown>>;
  leadsByAd?: Array<{ adName: string; leadCount: number }>;
  salesNotes?: string;
  programTrack?: string;
  sourceType?: string;
  objections?: Objection[];
}

export interface SalesReport {
  id: string;
  date: string;
  platform: string;
  salesRepId: string;
  salesRepName: string;
  rawText?: string;
  entryMode: "form" | "template";
  parsedData: ParsedReportData;
  confirmed: boolean;
  createdAt: Timestamp;
}

export interface Deal {
  id: string;
  salesRepId: string;
  salesRepName: string;
  teamName?: string;
  date: string;
  customerId: string;
  customerName: string;
  adSource: string;
  programName: string;
  programCount: number;
  dealValue: number;
  firstContactDate?: string;
  contactAttempts?: number;
  dealCategory?: "core" | "side";
  closeDate: string;
  closingCycleDays?: number;
  products: string[];
  bookingType: "self_booking" | "call_booking";
  closureType?: "call" | "self"; // legacy compatibility
  createdAt: Timestamp;
}

export interface Customer {
  id: string;
  name: string;
  normalizedName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Course {
  id: string;
  name: string;
  shortCode: string;
  isActive: boolean;
  order?: number;
  createdAt?: Timestamp;
}

export interface Insight {
  id: string;
  title?: string;
  content?: string;
  type?: string;
  createdAt?: Timestamp;
}

export interface AppNotification {
  id: string;
  uid: string;
  type: string;
  title?: string;
  body?: string;
  isRead?: boolean;
  createdAt?: Timestamp;
}

export interface Excuse {
  id: string;
  salesRepId: string;
  userName?: string;
  reason: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: Timestamp;
}

export interface DailyBucket {
  dateKey: string;
  label: string;
  labelDayMonth: string;
  msgs: number;
  interactions: number;
  conversionRate: number;
}

export interface SalesRepBucket {
  name: string;
  displayName: string;
  messages: number;
  interactions: number;
  conversionRate: number;
}

export interface LeakPieSlice {
  name: string;
  value: number;
  pct: number;
  fill: string;
}

export interface PlatformStats {
  whatsapp: { messages: number; interactions: number };
  messenger: { messages: number; interactions: number };
  tiktok: { messages: number; interactions: number };
}
