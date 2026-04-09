"use client";

import { useState } from "react";
import Link from "next/link"; 
import { usePathname, useRouter } from "next/navigation"; 
import { Search, Home, Menu, X, Briefcase } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  // Logic to prevent redundant search bars
  const isServicesPage = pathname === "/services" || pathname === "/all-services";

  const isActive = (path: string) => pathname === path;

  const navLinkStyles = (path: string) => `
    px-4 py-2 text-[13px] font-medium transition-all duration-200 rounded-md
    ${isActive(path) 
      ? "text-foreground bg-secondary/50" 
      : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"}
  `;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="flex items-center justify-between py-3">
          
          {/* Left - Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="p-1.5 rounded-lg group-hover:scale-105 transition-transform">
               <Home className="h-5 w-5 text-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              ServiGo<span className="text-emerald-500">.</span>
            </span>
          </Link>

          {/* Center - Conditional Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-12">
            {!isServicesPage && (
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                <input
                  type="text"
                  placeholder="Search for services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const value = searchQuery.trim();
                    router.push(
                      value
                        ? `/dashboard?tab=home&search=${encodeURIComponent(value)}`
                        : "/dashboard?tab=home"
                    );
                  }}
                  className="h-10 w-full rounded-full border border-border bg-background/50 pl-11 pr-5 text-sm transition-all focus:ring-2 focus:ring-foreground/5 focus:border-foreground/20 outline-none"
                />
              </div>
            )}
          </div>

          {/* Right - Streamlined Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/dashboard?tab=home" className={navLinkStyles("/services")}>
              Browse Services
            </Link>
            
            {/* <Link href="/for-workers" className={navLinkStyles("/for-workers")}>
              For Workers
            </Link> */}
            
            <div className="h-4 w-px bg-border mx-2" />
            
            <Link href="/auth/login" className="px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            
            <Link
              href="/join"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-[13px] font-bold text-background transition-transform hover:scale-[1.02] active:scale-95 shadow-md"
            >
              <Briefcase className="h-3.5 w-3.5" />
              Become a Worker
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="lg:hidden p-2 -mr-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu - Senior Refinement */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border pb-8 pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {!isServicesPage && (
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search services..."
                  className="h-12 w-full rounded-xl border border-border bg-muted/30 pl-11 pr-5 text-base outline-none focus:ring-2 focus:ring-foreground/5"
                />
              </div>
            )}
            <div className="flex flex-col space-y-1">
              <Link href="/dashboard?tab=home" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-lg transition-colors">Browse Services</Link>
              
              {/* <Link href="/for-workers" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-lg transition-colors">For Workers</Link> */}

              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-lg transition-colors">Login</Link>
              <div className="pt-4">
                <Link href="/join" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center rounded-xl bg-foreground px-4 py-4 text-base font-bold text-background shadow-lg">
                  Become a Worker
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
