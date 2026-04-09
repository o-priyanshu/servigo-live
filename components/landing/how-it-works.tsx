import { Search, ShieldCheck, CreditCard, CheckCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface Step {
  number: string
  title: string
  description: string
  icon: LucideIcon
}

const steps: Step[] = [
  {
    number: "01",
    title: "Search a Service",
    description:
      "Find the service you need using search or service categories.",
    icon: Search,
  },
  {
    number: "02",
    title: "Choose a Verified Professional",
    description:
      "View profiles, verification details, and customer ratings.",
    icon: ShieldCheck,
  },
  {
    number: "03",
    title: "Book & Pay Securely",
    description:
      "Schedule the service and complete payment safely online.",
    icon: CreditCard,
  },
  {
    number: "04",
    title: "Get the Job Done",
    description:
      "A verified professional completes the service at your home.",
    icon: CheckCircle,
  },
]

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon

  return (
    <div className="flex flex-col items-start">
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      </div>

      {/* Step Number */}
      <span className="mt-6 font-mono text-xs tracking-widest text-muted-foreground">
        {step.number}
      </span>

      {/* Title */}
      <h3 className="mt-2 text-base font-medium text-foreground">
        {step.title}
      </h3>

      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {step.description}
      </p>
    </div>
  )
}

export function HowItWorks() {
  return (
    <section className="w-full bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-balance font-sans text-2xl font-medium tracking-tight text-foreground lg:text-3xl">
            How ServiGo Works
          </h2>
          <p className="mt-3 text-sm text-muted-foreground lg:text-base">
            Book trusted home services in a few simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {steps.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>

        {/* Subtle bottom divider */}
        <div className="mt-20 border-t border-border" />
      </div>
    </section>
  )
}
