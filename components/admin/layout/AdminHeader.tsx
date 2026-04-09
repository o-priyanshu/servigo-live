"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, ShieldAlert } from "lucide-react";
import type { AdminRole } from "@/lib/admin/types";

interface AdminHeaderProps {
  adminName: string;
  adminRole: AdminRole;
}

export default function AdminHeader({ adminName, adminRole }: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <ShieldAlert size={14} className="text-amber-300" />
          <span className="uppercase tracking-wider">Restricted Administrative Environment</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center border border-zinc-700 text-zinc-200 hover:bg-zinc-900"
            aria-label="Admin notifications"
          >
            <Bell size={14} />
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-zinc-100">{adminName}</p>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">{adminRole.replace("_", " ")}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100 hover:bg-zinc-900 disabled:opacity-60"
          >
            <LogOut size={13} />
            {loggingOut ? "Exiting..." : "Logout"}
          </button>
        </div>
      </div>
    </header>
  );
}

