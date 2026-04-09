import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}

export default function Panel({ title, subtitle, className = "", children }: PanelProps) {
  return (
    <section className={`border border-zinc-800 bg-zinc-950/80 ${className}`}>
      {(title || subtitle) && (
        <div className="border-b border-zinc-800 px-4 py-3 sm:px-5">
          {title ? <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

