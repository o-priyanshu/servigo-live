import type { Earnings, Job, JobStatus, Provider } from "@/lib/types/provider";

const now = new Date();

function todayAt(hours: number, minutes: number): string {
  const d = new Date(now);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export const providerMock: Provider = {
  id: "prov_electrician_001",
  role: "provider",
  name: "Arjun Mehta",
  phone: "+91 98765 43210",
  email: "arjun.mehta@servigo.in",
  city: "Bengaluru",
  category: "electrician",
  radiusKm: 6,
  yearsOfExperience: 3,
  rating: 4.6,
  reviewCount: 128,
  verificationStatus: "verified",
  isOnline: true,
  bio: "Certified residential electrician focused on safe, timely service.",
  services: ["Wiring", "MCB", "Lighting", "Emergency Repair"],
  emergencyAvailable: true,
};

export const jobsMock: Job[] = [
  {
    id: "job_in_001",
    customerName: "Rahul Sharma",
    serviceType: "Appliance Repair",
    description: "Washing machine not spinning. Loud noise during wash cycle.",
    address: "HSR Layout Sector 2, Bengaluru",
    city: "Bengaluru",
    distanceKm: 2.1,
    scheduledAtIso: todayAt(16, 30),
    paymentEstimateInr: 850,
    status: "incoming",
    canMessage: false,
    customerPhone: "+91 90000 11001",
  },
  {
    id: "job_active_001",
    customerName: "Priya Nair",
    serviceType: "Complete House Wiring",
    description: "2BHK wiring inspection and partial rewiring.",
    address: "Whitefield Main Road, Bengaluru",
    city: "Bengaluru",
    distanceKm: 5.4,
    scheduledAtIso: todayAt(13, 0),
    paymentEstimateInr: 2400,
    status: "in_progress",
    canMessage: true,
    customerPhone: "+91 90000 11002",
  },
  {
    id: "job_done_001",
    customerName: "Neha Kapoor",
    serviceType: "MCB Replacement",
    description: "Frequent trip issue resolved with new MCB.",
    address: "Koramangala 4th Block, Bengaluru",
    city: "Bengaluru",
    distanceKm: 3.2,
    scheduledAtIso: todayAt(9, 45),
    paymentEstimateInr: 650,
    status: "completed",
    canMessage: true,
    customerPhone: "+91 90000 11003",
  },
  {
    id: "job_cancel_001",
    customerName: "Vivek Singh",
    serviceType: "Fan Installation",
    description: "Customer cancelled before arrival.",
    address: "Indiranagar, Bengaluru",
    city: "Bengaluru",
    distanceKm: 4.8,
    scheduledAtIso: todayAt(11, 15),
    paymentEstimateInr: 500,
    status: "cancelled",
    canMessage: false,
    customerPhone: "+91 90000 11004",
  },
  {
    id: "job_acc_001",
    customerName: "Ishita Verma",
    serviceType: "Socket Replacement",
    description: "Two damaged sockets near kitchen counter.",
    address: "JP Nagar 7th Phase, Bengaluru",
    city: "Bengaluru",
    distanceKm: 6.7,
    scheduledAtIso: todayAt(18, 0),
    paymentEstimateInr: 700,
    status: "accepted",
    canMessage: true,
    customerPhone: "+91 90000 11005",
  },
];

export const earningsMock: Earnings = {
  totalInr: 482350,
  todayInr: 2750,
  monthInr: 58640,
  commissionPercent: 15,
  netPayoutInr: 49844,
  weeklyTrendInr: [1800, 2400, 2900, 3200, 2600, 3800, 2750],
};

export function jobStatusTab(status: JobStatus): "incoming" | "active" | "completed" | "cancelled" {
  if (status === "incoming") return "incoming";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "active";
}
