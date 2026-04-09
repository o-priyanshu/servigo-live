import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/auth/AdminLoginForm";
import { getAdminSessionFromCookies } from "@/lib/admin/auth";

export default async function AdminLoginPage() {
  const session = await getAdminSessionFromCookies();
  if (session?.role === "admin") {
    redirect("/admin/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10">
      <AdminLoginForm />
    </main>
  );
}
