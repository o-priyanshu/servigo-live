import {
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  Gauge,
  Landmark,
  MapPin,
  Settings2,
  UserCog,
} from "lucide-react";

export const providerNavItems = [
  { href: "/provider/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/provider/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/provider/earnings", label: "Earnings", icon: CircleDollarSign },
  { href: "/provider/notifications", label: "Alerts", icon: Bell },
  { href: "/provider/hub", label: "Hub", icon: MapPin },
  { href: "/provider/availability", label: "Availability", icon: CalendarClock },
  { href: "/provider/bank-details", label: "Bank", icon: Landmark },
  { href: "/provider/profile", label: "Profile", icon: UserCog },
];

export const providerQuickLinks = [
  { href: "/provider/earnings", label: "Earnings" },
  { href: "/provider/notifications", label: "Notifications" },
  { href: "/provider/hub", label: "Hub" },
  { href: "/provider/bank-details", label: "Bank Details" },
  { href: "/provider/jobs?tab=completed", label: "Job History" },
  { href: "/provider/profile", label: "Profile" },
  { href: "/contact-support", label: "Support" },
];

export const providerTopActions = [
  { id: "alerts", icon: Bell, label: "Alerts" },
  { id: "settings", icon: Settings2, label: "Settings" },
];
