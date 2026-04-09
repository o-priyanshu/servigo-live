import Link from "next/link";
import { Home, MapPin, Search, UserCircle2 } from "lucide-react";

interface CustomerPageNavProps {
  searchPlaceholder?: string;
  locationLabel?: string;
}

export default function CustomerPageNav({
  searchPlaceholder = "Search providers in Selected Area",
  locationLabel = "Selected Area",
}: CustomerPageNavProps) {
  return (
    <header className="border-b border-border/70 bg-background/95">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/dashboard?tab=home" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background shadow-sm">
            <Home size={18} />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Secure Local
            </p>
            <span className="text-4xl font-bold tracking-tight text-foreground">
              ServiGo<span className="text-emerald-500">.</span>
            </span>
          </div>
        </Link>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="hidden h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 md:flex">
            <Search size={16} className="text-muted-foreground" />
            <input
              readOnly
              value={searchPlaceholder}
              className="w-full bg-transparent text-sm text-muted-foreground outline-none"
            />
          </div>
          <button
            type="button"
            className="inline-flex h-12 items-center gap-1 rounded-xl border border-border/80 bg-card px-3 text-sm text-foreground"
          >
            <MapPin size={14} className="text-muted-foreground" />
            <span className="max-w-36 truncate">{locationLabel}</span>
          </button>
          <Link
            href="/dashboard?tab=profile"
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground"
            aria-label="Open profile"
          >
            <UserCircle2 size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}
