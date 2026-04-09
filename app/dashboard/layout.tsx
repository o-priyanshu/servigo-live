"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const shouldRedirectToProvider = !!user && user.role === "provider";

  useEffect(() => {
    if (loading) return;
    if (user?.role === "provider") {
      router.replace(user.isProfileComplete ? "/provider/dashboard" : "/provider/register");
      return;
    }
  }, [loading, router, user]);

  if (loading || shouldRedirectToProvider) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
        <Loader2 className="mb-4 animate-spin text-black" size={40} />
        <p className="text-sm font-medium text-slate-500">
          Securing your session...
        </p>
      </div>
    );
  }

  return <main>{children}</main>;
}
