"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { adminNavItems } from "@/lib/admin/navigation";

export default function AdminSidebar() {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 lg:block">
      <div className="sticky top-0 h-dvh overflow-y-auto p-4">
        <Link href="/admin/dashboard" className="flex items-center gap-3 border border-zinc-800 bg-zinc-900 p-3">
          <span className="grid h-9 w-9 place-items-center bg-blue-600 text-white">
            <Shield size={16} />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">ServiGo</p>
            <p className="text-sm font-semibold text-zinc-100">Control Center</p>
          </div>
        </Link>

        <nav className="mt-4 space-y-1">
          {adminNavItems.map(({ href, label, icon: Icon }) => {
            const active = currentPath === href || currentPath.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 border px-3 py-2 text-sm ${
                  active
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-200"
                    : "border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

