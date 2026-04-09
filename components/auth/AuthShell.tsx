import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  sideTitle: string;
  sideBody: string;
  authTitle: string;
  authSubtitle: string;
  footerText: string;
  footerCta: string;
  footerHref: string;
  children: ReactNode;
}

export function AuthShell({
  sideTitle,
  sideBody,
  authTitle,
  authSubtitle,
  footerText,
  footerCta,
  footerHref,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      
      {/* LEFT SIDE (Hidden on Mobile) */}
      <section className="relative hidden lg:flex min-h-screen overflow-hidden">
        <Image
          src="/images/hero-auth.png"
          alt="Trusted service professionals at work"
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />

        <div className="absolute inset-0 bg-slate-950/55" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <h1 className="max-w-xl text-4xl xl:text-5xl font-bold leading-tight text-white">
            {sideTitle}
          </h1>
          <p className="mt-6 text-lg xl:text-xl font-medium text-slate-100">
            {sideBody}
          </p>
        </div>
      </section>

      {/* RIGHT SIDE (Auth Card) */}
      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-xl">
          
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              ServiGo
            </h2>

            <p className="mt-2 text-base sm:text-lg text-slate-500">
              {authSubtitle}
            </p>

            <p className="mt-6 text-2xl sm:text-3xl font-semibold text-slate-900">
              {authTitle}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {children}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm sm:text-base text-slate-500">
            {footerText}{" "}
            <Link
              href={footerHref}
              className="font-semibold text-slate-900 underline underline-offset-4 transition hover:opacity-80"
            >
              {footerCta}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}