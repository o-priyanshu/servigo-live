import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/layout/AdminShell";
import { getAdminSessionFromCookies } from "@/lib/admin/auth";

export default async function AdminSecureLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSessionFromCookies();

  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }

  return <AdminShell adminName={session.name} adminRole={session.role}>{children}</AdminShell>;
}

