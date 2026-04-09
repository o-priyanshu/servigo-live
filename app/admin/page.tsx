import { redirect } from "next/navigation";
import { getAdminSessionFromCookies } from "@/lib/admin/auth";

export default async function AdminEntryPage() {
  const session = await getAdminSessionFromCookies();
  if (session?.role === "admin") {
    redirect("/admin/dashboard");
  }
  redirect("/admin/login");
}

