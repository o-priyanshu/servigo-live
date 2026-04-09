import type { ReactNode } from "react";
import type { AdminRole } from "@/lib/admin/types";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import AdminHeader from "@/components/admin/layout/AdminHeader";
import AdminMobileNav from "@/components/admin/layout/AdminMobileNav";

interface AdminShellProps {
  children: ReactNode;
  adminName: string;
  adminRole: AdminRole;
}

export default function AdminShell({ children, adminName, adminRole }: AdminShellProps) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <AdminHeader adminName={adminName} adminRole={adminRole} />
          <main className="mx-auto w-full max-w-[1600px] p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
        </div>
      </div>
      <AdminMobileNav />
    </div>
  );
}
