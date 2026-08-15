export type UserRole = "guest" | "host" | "both";
export type UserStatus = "active" | "suspended" | "banned" | "pending";
export type KycStatus = "verified" | "pending" | "rejected" | "unverified";

export interface AppUser {
  id: string;
  /** Stays host profile UUID — required for approve/reject host actions. */
  hostProfileId?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  kyc: KycStatus;
  city: string;
  joinedAt: string;
  lastActiveAt: string;
  avatarColor: string;
  // host-specific
  listingsCount?: number;
  rating?: number;
  reviewsCount?: number;
  earnings?: number;
  bookingsCount?: number;
}

export type HostApplicationFilterStatus =
  | "pending"
  | "approved"
  | "needs_changes"
  | "rejected"
  | "frozen";

export interface HostApplication {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  hostType?: string;
  applicationStatus: string;
  verificationStatus: string;
  identityStatus: string;
  source?: string;
  submittedFrom?: string;
  identityReused: boolean;
  documentType?: string;
  documentFrontAssetId?: string;
  documentBackAssetId?: string;
  selfieAssetId?: string;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  listingFrozen?: boolean;
  status: UserStatus;
  avatarColor: string;
}

export type ListingStatus =
  | "active"
  | "approved"
  | "pending"
  | "draft"
  | "rejected"
  | "suspended"
  | "flagged";

export interface Listing {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  city: string;
  address: string;
  type: string;
  status: ListingStatus;
  rawStatus?: string;
  pricePerNight: number;
  rating: number;
  reviewsCount: number;
  bookingsCount: number;
  occupancy: number;
  bedrooms: number;
  guests: number;
  createdAt: string;
  photos: number;
  flags: string[];
  thumbnailColor: string;
}

export interface ListingMediaItem {
  assetId: string;
  kind: "PHOTO" | "VIDEO" | "WALKTHROUGH";
  sortOrder: number;
}

export interface ListingDetail extends Listing {
  description: string;
  fullAddress: string;
  checkInTime: string;
  checkOutTime: string;
  instantBooking: boolean;
  weekendPrice: number | null;
  depositPolicy: string;
  currency: string;
  maxGuests: number;
  petsPolicy: string;
  smokingPolicy: string;
  quietHours: boolean;
  couplesWelcome: boolean;
  amenities: string[];
  cancellationPolicy: string;
  extraRules: string;
  checkInContactName: string;
  checkInContactPhone: string;
  checkInContactRole: string;
  hostEmail: string;
  hostPhone: string;
  hostCity: string;
  mediaItems: ListingMediaItem[];
  rawStatus: string;
}

export type BookingRawStatus =
  | "INITIATED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED_BY_GUEST"
  | "CANCELLED_BY_HOST"
  | "EXPIRED";

export type BookingStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed";

export interface Booking {
  id: string;
  reference: string;
  guestUserId?: string;
  hostUserId?: string;
  guestName: string;
  hostName: string;
  listingTitle: string;
  listingId?: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  total: number;
  status: BookingStatus;
  rawStatus: string;
  createdAt: string;
  paidAt?: string | null;
  confirmedAt?: string | null;
  completedAt?: string | null;
  cancellationReason?: string;
}

export interface BookingOccupant {
  id: string;
  full_name: string;
  id_number?: string | null;
  is_primary: boolean;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  id_document_front_asset_id?: string | null;
  id_document_back_asset_id?: string | null;
  created_at?: string;
}

export interface BookingDetail extends Booking {
  listingId?: string;
  subtotal?: number;
  guestFee?: number;
  hostFee?: number;
  payoutAmount?: number | null;
  currency?: string;
  occupants: BookingOccupant[];
  ledger?: LedgerEntry[];
}

export interface Review {
  id: string;
  guestName: string;
  listingTitle: string;
  listingId?: string;
  hostName: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: "published" | "flagged" | "removed";
  sentiment: "positive" | "neutral" | "negative";
  flagReason?: string;
  media?: Array<{ assetId: string }>;
}

export type TicketCategory =
  | "BOOKING"
  | "PAYMENT"
  | "REFUND"
  | "CANCELLATION"
  | "HOST"
  | "GUEST"
  | "LISTING"
  | "KYC"
  | "TECHNICAL"
  | "FRAUD"
  | "OTHER";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "WAITING_FOR_HOST"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: TicketCategory;
  customerName: string;
  requesterEmail?: string;
  party: "GUEST" | "HOST";
  assignee?: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  firstAdminResponseAt?: string;
  bookingId?: string;
  bookingRef?: string;
  listingId?: string;
  reportId?: string;
  safetyIssueId?: string;
  unreadForSupport?: boolean;
  lastMessagePreview?: string;
  conversationId?: string;
  requesterUserId?: string;
  sla?: SupportSlaPayload;
  routingSuggestion?: { suggestedPriority: TicketPriority; reason: string };
  csat?: TicketCsat | null;
  operationalSignalTypes?: string[];
}

export type SupportSlaState = "ON_TRACK" | "AT_RISK" | "BREACHED";

export interface SupportSlaLeg {
  targetAt: string;
  completedAt: string | null;
  state: SupportSlaState;
}

export interface SupportSlaPayload {
  firstResponse: SupportSlaLeg;
  resolution: SupportSlaLeg;
}

export interface TicketCsat {
  rating: number;
  comment?: string | null;
  submittedAt: string;
  agentRating?: number | null;
  agentId?: string | null;
  problemSolved?: boolean | null;
}

export interface CannedReply {
  id: string;
  title: string;
  body: string;
  category?: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface SupportAnalytics {
  from: string;
  to: string;
  tickets: {
    created: number;
    open: number;
    resolved: number;
    closed: number;
    escalated: number;
  };
  response: {
    averageFirstResponseSeconds: number | null;
    medianFirstResponseSeconds: number | null;
  };
  firstResolution: {
    averageSeconds: number | null;
    medianSeconds: number | null;
  };
  closure: {
    averageSeconds: number | null;
    medianSeconds: number | null;
  };
  sla: {
    firstResponse: { onTrack: number; atRisk: number; breached: number };
    firstResolution: { onTrack: number; atRisk: number; breached: number };
  };
  csat: {
    responses: number;
    averageRating: number | null;
    ratingDistribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  };
  categories: { category: string; count: number }[];
  priorities: { priority: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  assignment: { assigned: number; unassigned: number };
  volume: { date: string; created: number; closed: number }[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: "USER" | "CUSTOMER" | "SUPPORT_AGENT" | "SYSTEM";
  senderId?: string;
  body: string;
  createdAt: string;
}

/** Internal admin-only note — never enters customer messages/SSE. */
export interface TicketNote {
  id: string;
  ticketId: string;
  authorAdminId: string;
  body: string;
  createdAt: string;
}

/** Metadata-only audit row for ticket/report timelines. */
export interface SupportActivityItem {
  id: string;
  action: string;
  actorId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface InvestigationMessage {
  id: string;
  senderId?: string | null;
  senderRole: "GUEST" | "HOST" | "UNKNOWN";
  type?: string;
  body: string;
  conversationSequence: number;
  createdAt: string;
  attachments: TrustEvidence[];
}

export interface TicketLinkedReport {
  id: string;
  reason?: string | null;
  conversationId?: string;
  reporterUserId?: string;
}

export interface TicketLinkedSafetyIssue {
  id: string;
  category?: string;
  details?: string | null;
  conversationId?: string;
  reporterUserId?: string;
}

export interface SupportPartyContact {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface TicketDetail extends Ticket {
  conversationId?: string;
  listingTitle?: string;
  hostUserId?: string;
  host?: SupportPartyContact | null;
  guest?: SupportPartyContact | null;
  reporter?: SupportPartyContact | null;
  listing?: {
    id: string;
    title?: string;
    hostUserId?: string;
    city?: string;
    address?: string | null;
    host?: SupportPartyContact;
    checkInContact?: {
      name?: string | null;
      phone?: string | null;
      role?: string | null;
    } | null;
  } | null;
  report?: TicketLinkedReport | null;
  safetyIssue?: TicketLinkedSafetyIssue | null;
  signals?: OperationalSignal[];
  relatedTickets?: RelatedSupportTicket[];
}

export type OperationalSignalType =
  | "REPEAT_REPORT"
  | "REPEAT_SAFETY_REPORT"
  | "MULTIPLE_OPEN_TICKETS"
  | "SLA_ATTENTION"
  | "SLA_BREACHED"
  | "UNASSIGNED_HIGH_PRIORITY"
  | "LOW_CSAT_PATTERN";

export interface OperationalSignal {
  id: string;
  type: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  reason: { code: string; explanation: string };
  firstDetectedAt: string;
  lastDetectedAt: string;
  ticketId?: string | null;
}

export interface RelatedSupportTicket {
  id: string;
  ticketNumber: string;
  status: string;
  priority: string;
  relationship: string;
}

export interface SupportOperationsOverview {
  activeTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  escalatedTickets: number;
  unassignedTickets: number;
  highPriorityTickets: number;
  highPriorityUnassigned: number;
  urgentTickets: number;
  slaOnTrack: number;
  slaAtRisk: number;
  slaBreached: number;
  activeSignals: number;
  acknowledgedSignals: number;
  generatedAt?: string;
  agentWorkload: {
    adminId: string;
    openTickets: number;
    highPriorityTickets: number;
    waitingTickets: number;
  }[];
}

export interface SupportAttentionItem {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  assignedAdminId: string | null;
  createdAt: string;
  attentionReasons: string[];
}

export interface SupportAttentionResult {
  items: SupportAttentionItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PaymentRecord {
  id: string;
  bookingId?: string;
  bookingRef?: string;
  provider?: string;
  providerIntentId?: string;
  amount: number;
  currency: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING" | "REFUNDED" | "CANCELLED";
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  bookingId?: string;
  bookingRef?: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SETTLED" | "FAILED";
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  bookingId: string;
  type: "GUEST_PAYMENT" | "HOST_PAYOUT" | "PLATFORM_FEE" | "REFUND";
  amount: number;
  currency: string;
  status: "PENDING" | "SETTLED" | "FAILED";
  createdAt: string;
}

export interface TrustPerson {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface TrustEvidence {
  id: string;
  url: string;
  contentType?: string;
  filename?: string | null;
  createdAt?: string;
}

export interface SafetyReport {
  id: string;
  kind: "conversation_reported" | "safety_issue" | "listing" | "user";
  reason?: string;
  category?: string;
  reporterId?: string;
  conversationId?: string;
  bookingId?: string;
  listingId?: string;
  supportTicketId?: string;
  createdAt: string;
  status?: string;
  reporter?: TrustPerson | null;
  reportedUser?: TrustPerson | null;
  booking?: { id: string; reference?: string | null } | null;
  listing?: { id: string; title?: string | null } | null;
  ticket?: { id: string; ticketNumber: string; status: string } | null;
  evidenceCount?: number;
  evidence?: TrustEvidence[];
  operationalSignals?: OperationalSignal[];
}

export interface RiskFlag {
  id: string;
  type: string;
  target: string;
  targetType: "host" | "listing" | "user";
  severity: "low" | "medium" | "high";
  detail: string;
  detectedAt: string;
  status: "open" | "reviewing" | "resolved";
}

export interface KycRecord {
  id: string;
  name: string;
  role: "host" | "guest";
  status: KycStatus;
  provider: string;
  submittedAt: string;
  reviewedAt?: string;
  failureReason?: string;
  documentType: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  module: string;
  target: string;
  before?: string;
  after?: string;
  ip: string;
  timestamp: string;
}

export interface ActivityEvent {
  id: string;
  type:
    | "booking"
    | "host_signup"
    | "listing_submitted"
    | "cancellation"
    | "refund"
    | "kyc_approved"
    | "review";
  title: string;
  detail: string;
  timestamp: string;
}

export interface RolePermission {
  id: string;
  name: string;
  description: string;
  members: number;
  permissions: Record<string, ("view" | "edit" | "delete" | "approve")[]>;
}
