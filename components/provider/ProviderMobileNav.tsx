"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { providerNavItems } from "@/components/provider/provider-nav";

export default function ProviderMobileNav() {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 p-2 backdrop-blur lg:hidden">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${providerNavItems.length}, minmax(0, 1fr))` }}
      >
        {providerNavItems.map(({ href, label, icon: Icon }) => {
          const active = currentPath === href || currentPath.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center rounded-lg px-2 py-2 text-[11px] ${
                active ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              <Icon size={16} />
              <span className="mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
