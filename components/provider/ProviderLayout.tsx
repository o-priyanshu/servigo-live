import type { ReactNode } from "react";
import ProviderSidebar from "@/components/provider/ProviderSidebar";
import ProviderTopbar from "@/components/provider/ProviderTopbar";
import ProviderMobileNav from "@/components/provider/ProviderMobileNav";

interface ProviderLayoutProps {
  children: ReactNode;
}

export default function ProviderLayout({ children }: ProviderLayoutProps) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-background via-slate-50/50 to-emerald-50/30">
      <div className="flex min-h-dvh">
        <ProviderSidebar />
        <div className="min-w-0 flex-1">
          <ProviderTopbar />
          <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-28 sm:px-6 lg:pb-6">{children}</main>
        </div>
      </div>
      <ProviderMobileNav />
    </div>
  );
}
