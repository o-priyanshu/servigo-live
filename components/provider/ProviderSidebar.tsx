"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { providerNavItems } from "@/components/provider/provider-nav";

export default function ProviderSidebar() {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/80 bg-card lg:block">
      <div className="sticky top-0 h-dvh overflow-y-auto p-5">
        <Link href="/provider/dashboard" className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Provider Console
            </p>
            <p className="text-2xl font-bold tracking-tight">
              ServiGo<span className="text-emerald-500">.</span>
            </p>
          </div>
        </Link>

        <nav className="mt-6 space-y-1.5">
          {providerNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = currentPath === href || currentPath.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
