"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, CalendarDays, User } from "lucide-react";

const navItems = [
  { label: "Home", icon: Home, tab: "home" },
  { label: "Bookings", icon: CalendarDays, tab: "bookings" },
  { label: "Profile", icon: User, tab: "profile" },
];

interface CustomerLayoutProps {
  children: ReactNode;
  navbarContent?: ReactNode;
}

const CustomerLayout = ({ children, navbarContent }: CustomerLayoutProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") ?? "home";

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-slate-50/60 to-emerald-50/40">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background shadow-sm">
              <Home size={17} />
            </span>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Secure Local
              </p>
              <span className="text-lg font-bold tracking-tight text-foreground">
                ServiGo<span className="text-emerald-500">.</span>
              </span>
            </div>
          </div>
          {navbarContent ? (
            <div className="ml-auto min-w-0 flex-1">
              {navbarContent}
            </div>
          ) : null}
        </div>
      </header>

      {/* Page Content */}
      <main className="pb-28 md:pb-36">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/95 px-2 py-2 shadow-[0_-8px_24px_rgba(2,8,23,0.08)] backdrop-blur-xl md:bottom-4 md:left-1/2 md:right-auto md:w-[min(760px,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-2xl md:border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-around">
          {navItems.map(({ label, icon: Icon, tab }) => {
            const isActive = currentTab === tab;
            return (
              <button
                key={tab}
                onClick={() => router.push(`${pathname}?tab=${tab}`)}
                className={`flex min-w-24 flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition ${
                  isActive
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default CustomerLayout;
