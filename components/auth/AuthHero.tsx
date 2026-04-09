"use client"

import Image from "next/image"
import { ShieldCheck } from "lucide-react"

export function AuthHero() {
  return (
    <section className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Background Image with optimized loading */}
      <Image
        src="/images/hero-auth.png"
        alt="A verified professional service provider at work, representing trust and reliability"
        fill
        className="object-cover"
        priority
        sizes="(max-width: 1024px) 100vw, 50vw" // Prevents downloading oversized assets
        quality={85}
      />

      {/* Refined Multi-layer Overlay: 
        1. Base dark tint 
        2. Gradient to ensure text legibility 
      */}
      <div className="absolute inset-0 bg-slate-900/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/20" />

      {/* Text Overlay with Entrance Animation */}
      <div className="relative z-10 flex flex-col gap-6 px-12 animate-in fade-in slide-in-from-left-8 duration-1000 ease-out">
        
        {/* Trust Badge */}
        <div className="flex items-center gap-2 w-fit px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white">
            Verified Network
          </span>
        </div>

        <div className="space-y-4">
          <h2 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tighter text-white xl:text-6xl">
            Connecting Trusted <br /> 
            <span className="text-indigo-300">Service Providers</span> <br />
            with Homes.
          </h2>
          
          <div className="flex items-center gap-4">
             <p className="text-lg font-medium text-slate-200">
               Secure. Verified. Reliable.
             </p>
             <div className="h-1 w-12 bg-indigo-500 rounded-full" />
          </div>
        </div>

        {/* Bottom Trust Indicators (Subtle) */}
        <div className="mt-8 flex gap-8 opacity-60">
           <div className="flex flex-col">
              <span className="text-xl font-bold text-white">100%</span>
              <span className="text-[10px] uppercase text-slate-300 font-medium">Identity Checked</span>
           </div>
           <div className="flex flex-col">
              <span className="text-xl font-bold text-white">24/7</span>
              <span className="text-[10px] uppercase text-slate-300 font-medium">Secure Support</span>
           </div>
        </div>
      </div>
    </section>
  )
}