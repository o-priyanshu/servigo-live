import Link from "next/link"
import { Github, Twitter, Instagram, Linkedin, ArrowRight } from "lucide-react"

export function SiteFooter() {
  // Shared class for the animated underline effect
  const underlineStyle = "relative after:absolute after:bottom-[-2px] after:left-0 after:h-[1px] after:w-0 after:bg-emerald-600 after:transition-all after:duration-300 hover:after:w-full"

  return (
    <footer className="w-full bg-[#f8f8f6] border-t border-stone-200 text-stone-950">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">

        {/* Top: Brand & CTA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-12">
          <div>
            <h2 className="text-4xl font-light tracking-tight md:text-5xl">
              ServiGo<span className="text-emerald-500">.</span>
            </h2>
            <p className="mt-3 max-w-sm text-sm font-medium text-stone-500 leading-relaxed">
              Elevating Indian home services through verified professionalism.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Join our network</span>
            <Link href="/professionals" className="group flex items-center gap-2 text-lg font-medium">
              <span className={underlineStyle}>Become a Partner</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-emerald-600" />
            </Link>
          </div>
        </div>

        {/* Middle: Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 border-y border-stone-200/60 py-10">
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Navigation</h3>
            <nav className="flex flex-wrap gap-x-6 gap-y-3">
              {['Home', 'Services', 'How it Works', 'Careers'].map((item) => (
                <Link key={item} href="#" className={`text-sm font-medium text-stone-600 hover:text-emerald-600 transition-colors ${underlineStyle}`}>
                  {item}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Company</h3>
            <nav className="flex flex-wrap gap-x-6 gap-y-3">
              {['Privacy', 'Terms', 'Safety', 'Press'].map((item) => (
                <Link key={item} href="#" className={`text-sm font-medium text-stone-600 hover:text-emerald-600 transition-colors ${underlineStyle}`}>
                  {item}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Social</h3>
            <div className="flex gap-5">
              {[Twitter, Instagram, Linkedin, Github].map((Icon, i) => (
                <a key={i} href="#" className="text-stone-400 hover:text-emerald-600 transition-colors">
                  <Icon className="h-5 w-5 stroke-[1.5]" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Regional Context */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 gap-6">
          <div className="flex items-center gap-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
              © 2026 ServiGo India
            </p>
            <div className="h-3 w-px bg-stone-200 hidden md:block" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500">
              Headquartered in Bengaluru
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-stone-600">
              Operating in 12 Indian Cities
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}