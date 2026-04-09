import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const services = [
  {
    name: "Plumber",
    image: "/images/service-plumber.jpg",
    alt: "Professional plumber repairing kitchen pipes",
    href: "/dashboard?tab=home&category=plumber",
  },
  {
    name: "Electrician",
    image: "/images/service-electrician.jpg",
    alt: "Electrician installing a light switch in a modern home",
    href: "/dashboard?tab=home&category=electrician",
  },
  {
    name: "Home Cleaning",
    image: "/images/service-cleaning.jpg",
    alt: "Professional cleaner wiping a kitchen countertop",
    href: "/dashboard?tab=home&category=cleaner",
  },
  {
    name: "Maid",
    image: "/images/service-maid.jpg",
    alt: "Maid making a bed with fresh white linen",
    href: "/dashboard?tab=home&category=cleaner",
  },
  {
    name: "Driver",
    image: "/images/service-driver.jpg",
    alt: "Professional driver standing by a car ready for passengers",
    href: "/dashboard?tab=home",
  },
  {
    name: "Carpenter",
    image: "/images/service-carpenter.jpg",
    alt: "Carpenter assembling furniture in a living room",
    href: "/dashboard?tab=home&category=carpenter",
  },
];

export function PopularServices() {
  return (
    <section className="w-full bg-background py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-6">
        {/* Section Header */}
        <div className="mb-12 lg:mb-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl text-balance">
            Popular Home Services
          </h2>
          <p className="mt-3 text-base text-muted-foreground lg:text-lg">
            Find verified professionals for everyday home needs.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.name}
              href={service.href}
              className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:shadow-md active:scale-[0.98]"
            >
              {/* Optimized Image Container */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                <Image
                  src={service.image}
                  alt={service.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  priority={service.name === "Plumber"} // Loads the first image faster
                />
              </div>

              {/* Text Content */}
              <div className="flex flex-col gap-1 px-5 py-4">
                <h3 className="text-base font-medium text-foreground transition-colors group-hover:text-primary">
                  {service.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Verified professionals available
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-12 flex items-center">
          <Link
            href="/dashboard?tab=home"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all services
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
