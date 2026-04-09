import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center">
      {/* 1. Optimized Next.js Image for the Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-image.jpg" // Ensure this exists in /public/images/
          alt="Clean modern home interior"
          fill
          priority // Highest loading priority for the Hero image
          className="object-cover object-center"
          aria-hidden="true"
        />
        
        {/* Soft neutral overlay */}
        <div className="absolute inset-0 bg-background/30" />
        
        {/* Bottom fade to white background */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-32 pb-20 lg:pt-40 lg:pb-28">
        {/* Changed max-w-[1280px] to max-w-7xl above */}
        
        <div className="max-w-2xl">
          {/* Headline */}
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] text-balance">
            Find Trusted & Verified Home Service Professionals
          </h1>

          {/* Subtext */}
          <p className="mt-6 max-w-lg text-base leading-relaxed text-foreground/70 lg:text-lg">
            Book domestic services with confidence. Every worker is verified,
            background-checked, and rated for your safety.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard?tab=home"
              className="group inline-flex items-center gap-2.5 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Search Services
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            
            {/* <Link
              href="/how-verification-works"
              className="inline-flex items-center rounded-lg border border-foreground/20 bg-background/60 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:border-foreground/35 hover:bg-background/80"
            >
              How Verification Works
            </Link> */}
          </div>
        </div>
      </div>
    </section>
  );
}
