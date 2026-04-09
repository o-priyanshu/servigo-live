import Link from "next/link";
import Image from "next/image";
import { Clock, ShieldCheck, Banknote, Users } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Flexible Work",
    description: "Accept jobs based on your availability.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Customers",
    description: "Work with trusted customers through the platform.",
  },
  {
    icon: Banknote,
    title: "Secure Payments",
    description: "Get paid safely and on time for every completed job.",
  },
  {
    icon: Users,
    title: "More Job Opportunities",
    description: "Reach more customers without middlemen.",
  },
];

export function ForWorkers() {
  return (
    <section className="w-full bg-background py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          
          {/* Left Column -- Text Content */}
          <div className="flex flex-1 flex-col">
            {/* Section Header */}
            <div className="mb-10">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl text-balance">
                For Service Professionals
              </h2>
              <p className="mt-3 max-w-md text-base text-muted-foreground lg:text-lg">
                Grow your income with flexible work and verified customers.
              </p>
            </div>

            {/* Benefit Points */}
            <div className="flex flex-col gap-8">
              {benefits.map((item) => (
                <div key={item.title} className="group flex gap-4">
                  {/* Icon Box with slight hover effect */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/50 transition-colors group-hover:bg-secondary">
                    <item.icon
                      className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10">
              <Link
                href="/join"
                className="inline-flex items-center justify-center rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                Become a Worker
              </Link>
            </div>
          </div>

          {/* Right Column -- Photo */}
          <div className="flex flex-1 items-center justify-center lg:justify-end">
            {/* Aspect container helps prevent layout shift */}
            <div className="relative aspect-4/5 w-full max-w-md overflow-hidden rounded-xl border border-border shadow-2xl">
              <Image
                src="/images/for-workers.jpg"
                alt="A confident service professional in work attire"
                fill
                sizes="(max-width: 768px) 100vw, 450px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
