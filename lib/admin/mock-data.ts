import type {
  Admin,
  AdminAuditLog,
  AdminSettings,
  AnalyticsSeriesPoint,
  Booking,
  Provider,
  Report,
  User,
} from "@/lib/admin/types";

export interface AdminCredential extends Admin {
  password: string;
}

export const adminCredentials: AdminCredential[] = [
  {
    id: "adm-001",
    name: "Neha Sharma",
    email: "admin@servigo.in",
    role: "admin",
    password: "Admin@123456",
    permissions: ["all"],
  },
  {
    id: "adm-002",
    name: "Rahul Verma",
    email: "ops.subadmin@servigo.in",
    role: "sub_admin",
    password: "SubAdmin@123",
    permissions: ["providers.review", "reports.manage", "bookings.view"],
  },
];

export const adminUsers: User[] = [
  {
    id: "usr-001",
    name: "Aarav Nair",
    email: "aarav.nair@gmail.com",
    role: "user",
    totalBookings: 14,
    reportsFiled: 0,
    accountStatus: "active",
    city: "Bengaluru",
    createdAt: "2025-12-05T09:30:00.000Z",
  },
  {
    id: "usr-002",
    name: "Priya Menon",
    email: "priya.menon@gmail.com",
    role: "user",
    totalBookings: 22,
    reportsFiled: 2,
    accountStatus: "warned",
    city: "Hyderabad",
    createdAt: "2025-10-15T10:15:00.000Z",
  },
  {
    id: "usr-003",
    name: "Vikas Bhat",
    email: "vikas.bhat@gmail.com",
    role: "user",
    totalBookings: 5,
    reportsFiled: 3,
    accountStatus: "suspended",
    city: "Pune",
    createdAt: "2025-11-02T12:20:00.000Z",
  },
  {
    id: "usr-004",
    name: "Sneha Iyer",
    email: "sneha.iyer@gmail.com",
    role: "user",
    totalBookings: 9,
    reportsFiled: 0,
    accountStatus: "active",
    city: "Chennai",
    createdAt: "2026-01-08T08:05:00.000Z",
  },
];

export const adminProviders: Provider[] = [
  {
    id: "prv-101",
    name: "Rajesh Kumar",
    email: "rajesh.kumar@servigo.pro",
    category: "electrician",
    city: "Bengaluru",
    verificationStatus: "pending",
    rating: 4.8,
    joinDate: "2026-02-24T08:00:00.000Z",
    accountStatus: "active",
    earningsThisMonth: 28500,
    activeBookings: 3,
    aiVerificationResult: "manual_review",
    complaintHistoryCount: 1,
    documents: {
      idDocumentUrl:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80",
      selfieUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
      policeCertificateUrl:
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80",
    },
    fraudFlags: [
      {
        id: "ff-001",
        reason: "Selfie face match confidence below threshold",
        severity: "medium",
        createdAt: "2026-02-24T09:10:00.000Z",
        resolved: false,
      },
    ],
  },
  {
    id: "prv-102",
    name: "Manoj Tiwari",
    email: "manoj.tiwari@servigo.pro",
    category: "plumber",
    city: "Delhi",
    verificationStatus: "suspended",
    rating: 3.9,
    joinDate: "2025-11-12T11:00:00.000Z",
    accountStatus: "suspended",
    earningsThisMonth: 9200,
    activeBookings: 0,
    aiVerificationResult: "pass",
    complaintHistoryCount: 6,
    documents: {
      idDocumentUrl:
        "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=80",
      selfieUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
    },
    fraudFlags: [
      {
        id: "ff-002",
        reason: "Repeated customer complaints for no-show",
        severity: "high",
        createdAt: "2026-02-20T14:00:00.000Z",
        resolved: false,
      },
    ],
  },
  {
    id: "prv-103",
    name: "Anjali Rao",
    email: "anjali.rao@servigo.pro",
    category: "cleaner",
    city: "Mumbai",
    verificationStatus: "verified",
    rating: 4.7,
    joinDate: "2025-08-01T06:00:00.000Z",
    accountStatus: "active",
    earningsThisMonth: 40800,
    activeBookings: 6,
    aiVerificationResult: "pass",
    complaintHistoryCount: 0,
    documents: {
      idDocumentUrl:
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=900&q=80",
      selfieUrl:
        "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=900&q=80",
    },
    fraudFlags: [],
  },
];

export const adminBookings: Booking[] = [
  {
    id: "bk-8812",
    customerId: "usr-001",
    customerName: "Aarav Nair",
    providerId: "prv-103",
    providerName: "Anjali Rao",
    service: "Deep Home Cleaning",
    category: "cleaner",
    status: "completed",
    amount: 3200,
    city: "Mumbai",
    createdAt: "2026-02-26T10:00:00.000Z",
    scheduledAt: "2026-02-27T09:00:00.000Z",
    commissionPercent: 15,
    cancellationHistory: [],
    disputeNotes: [],
    timeline: [
      { at: "2026-02-26T10:00:00.000Z", title: "Booking Created", description: "Customer placed booking." },
      { at: "2026-02-26T10:10:00.000Z", title: "Provider Accepted", description: "Provider accepted request." },
      { at: "2026-02-27T09:15:00.000Z", title: "Service Started", description: "Provider marked job started." },
      { at: "2026-02-27T11:20:00.000Z", title: "Completed", description: "Job completed and confirmed." },
    ],
    chatPreview: [
      { id: "c1", sender: "customer", text: "Please bring eco-friendly products.", at: "2026-02-26T10:15:00.000Z" },
      { id: "c2", sender: "provider", text: "Sure, will do.", at: "2026-02-26T10:16:00.000Z" },
    ],
    fraudFlags: [],
  },
  {
    id: "bk-8921",
    customerId: "usr-002",
    customerName: "Priya Menon",
    providerId: "prv-101",
    providerName: "Rajesh Kumar",
    service: "Emergency Electrical Repair",
    category: "electrician",
    status: "in_progress",
    amount: 5400,
    city: "Bengaluru",
    createdAt: "2026-02-28T07:00:00.000Z",
    scheduledAt: "2026-02-28T08:30:00.000Z",
    commissionPercent: 15,
    cancellationHistory: [],
    disputeNotes: ["Customer requested partial refund for delay; pending review."],
    timeline: [
      { at: "2026-02-28T07:00:00.000Z", title: "Booking Created", description: "High-priority emergency booking." },
      { at: "2026-02-28T07:09:00.000Z", title: "Provider Accepted", description: "Provider accepted within SLA." },
      { at: "2026-02-28T09:12:00.000Z", title: "In Progress", description: "Work started on-site." },
    ],
    chatPreview: [
      { id: "c3", sender: "customer", text: "Power is unstable in living room.", at: "2026-02-28T07:03:00.000Z" },
      { id: "c4", sender: "provider", text: "I am 10 mins away.", at: "2026-02-28T07:25:00.000Z" },
      { id: "c5", sender: "system", text: "Escalation tag added by support.", at: "2026-02-28T09:30:00.000Z" },
    ],
    fraudFlags: [],
  },
  {
    id: "bk-9007",
    customerId: "usr-003",
    customerName: "Vikas Bhat",
    providerId: "prv-102",
    providerName: "Manoj Tiwari",
    service: "Pipe Replacement",
    category: "plumber",
    status: "fraud_flagged",
    amount: 8600,
    city: "Delhi",
    createdAt: "2026-02-22T12:00:00.000Z",
    scheduledAt: "2026-02-23T10:00:00.000Z",
    commissionPercent: 15,
    cancellationHistory: ["Cancelled once by provider 30 min before start time."],
    disputeNotes: ["Payment mismatch reported by customer.", "Potential overcharge suspected."],
    timeline: [
      { at: "2026-02-22T12:00:00.000Z", title: "Booking Created", description: "Standard booking created." },
      { at: "2026-02-22T12:30:00.000Z", title: "Accepted", description: "Provider accepted booking." },
      { at: "2026-02-23T09:20:00.000Z", title: "Cancelled by Provider", description: "Provider cancelled once." },
      { at: "2026-02-23T10:40:00.000Z", title: "Fraud Flagged", description: "Automated fraud model flagged transaction." },
    ],
    chatPreview: [
      { id: "c6", sender: "customer", text: "You quoted 4k but invoice says 8.6k.", at: "2026-02-23T11:00:00.000Z" },
      { id: "c7", sender: "provider", text: "Additional parts were required.", at: "2026-02-23T11:05:00.000Z" },
    ],
    fraudFlags: [
      {
        id: "ff-003",
        reason: "Price deviation > 70% from category median",
        severity: "critical",
        createdAt: "2026-02-23T10:40:00.000Z",
        resolved: false,
      },
    ],
  },
];

export const adminReports: Report[] = [
  {
    id: "rpt-1001",
    targetType: "provider",
    targetId: "prv-102",
    targetName: "Manoj Tiwari",
    reason: "Demanded off-platform payment and threatened service cancellation",
    severity: "critical",
    date: "2026-02-23T13:15:00.000Z",
    status: "open",
  },
  {
    id: "rpt-1002",
    targetType: "user",
    targetId: "usr-003",
    targetName: "Vikas Bhat",
    reason: "Abusive chat behavior",
    severity: "high",
    date: "2026-02-24T09:00:00.000Z",
    status: "under_investigation",
  },
  {
    id: "rpt-1003",
    targetType: "provider",
    targetId: "prv-101",
    targetName: "Rajesh Kumar",
    reason: "Late arrival complaint",
    severity: "medium",
    date: "2026-02-28T09:12:00.000Z",
    status: "open",
  },
];

export const dailyBookingsSeries: AnalyticsSeriesPoint[] = [
  { label: "Mon", value: 148 },
  { label: "Tue", value: 162 },
  { label: "Wed", value: 171 },
  { label: "Thu", value: 158 },
  { label: "Fri", value: 184 },
  { label: "Sat", value: 201 },
  { label: "Sun", value: 176 },
];

export const revenueSeries: AnalyticsSeriesPoint[] = [
  { label: "Week 1", value: 28400 },
  { label: "Week 2", value: 31200 },
  { label: "Week 3", value: 29800 },
  { label: "Week 4", value: 35100 },
];

export const providerGrowthSeries: AnalyticsSeriesPoint[] = [
  { label: "Oct", value: 24 },
  { label: "Nov", value: 29 },
  { label: "Dec", value: 37 },
  { label: "Jan", value: 42 },
  { label: "Feb", value: 48 },
];

export const cancellationRateSeries: AnalyticsSeriesPoint[] = [
  { label: "Mon", value: 4.2 },
  { label: "Tue", value: 4.7 },
  { label: "Wed", value: 5.1 },
  { label: "Thu", value: 4.4 },
  { label: "Fri", value: 5.8 },
  { label: "Sat", value: 6.4 },
  { label: "Sun", value: 5.0 },
];

export const fraudCountSeries: AnalyticsSeriesPoint[] = [
  { label: "Mon", value: 3 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 4 },
  { label: "Thu", value: 5 },
  { label: "Fri", value: 6 },
  { label: "Sat", value: 4 },
  { label: "Sun", value: 3 },
];

export const adminSettingsSeed: AdminSettings = {
  commissionPercentage: 15,
  emergencyBookingFee: 99,
  providerVisibilityRadiusKm: 5,
  fraudAutoSuspendThreshold: 85,
  fraudManualReviewThreshold: 65,
  subAdmins: [adminCredentials[1]],
};

export const seedAuditLogs: AdminAuditLog[] = [
  {
    id: "log-001",
    adminName: "Neha Sharma",
    action: "Suspended provider for repeated no-show",
    entityType: "provider",
    entityId: "prv-102",
    createdAt: "2026-02-25T10:30:00.000Z",
  },
  {
    id: "log-002",
    adminName: "Neha Sharma",
    action: "Escalated booking bk-9007 to investigation",
    entityType: "booking",
    entityId: "bk-9007",
    createdAt: "2026-02-23T14:10:00.000Z",
  },
];

export function getProviderById(id: string): Provider | undefined {
  return adminProviders.find((provider) => provider.id === id);
}

export function getBookingById(id: string): Booking | undefined {
  return adminBookings.find((booking) => booking.id === id);
}

