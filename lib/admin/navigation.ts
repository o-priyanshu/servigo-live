import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookCopy,
  Building2,
  CreditCard,
  LayoutDashboard,
  Scale,
  Settings,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/verification", label: "Worker Verification", icon: UserCheck },
  { href: "/admin/workers", label: "Workers", icon: Users },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: BookCopy },
  { href: "/admin/disputes", label: "Disputes", icon: Scale },
  { href: "/admin/hubs", label: "Hubs", icon: Building2 },
  { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { href: "/admin/transactions/withdrawals", label: "Withdrawals", icon: Wallet },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export const adminQuickActions = [
  { href: "/admin/verification", label: "Verify Workers", icon: UserCheck },
  { href: "/admin/disputes", label: "Resolve Disputes", icon: Scale },
  { href: "/admin/transactions/withdrawals", label: "Process Withdrawals", icon: Wallet },
];

