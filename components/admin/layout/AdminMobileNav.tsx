"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems } from "@/lib/admin/navigation";

const MOBILE_PRIMARY_ITEMS = adminNavItems.slice(0, 5);

export default function AdminMobileNav() {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5 gap-1">
        {MOBILE_PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = currentPath === href || currentPath.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-[11px] ${
                  active
                    ? "border-blue-500/60 bg-blue-500/15 text-blue-200"
                    : "border-zinc-800 text-zinc-300"
                }`}
              >
                <Icon size={14} />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
