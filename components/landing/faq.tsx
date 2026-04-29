"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqItems = [
  {
    question: "Are service professionals verified?",
    answer:
      "Yes. All professionals on ServiGo go through identity and background verification before being listed.",
  },
  {
    question: "How does payment work?",
    answer:
      "Payments are made securely through ServiGo after booking a service. You'll see the final amount before confirming.",
  },
  {
    question: "Can I cancel or reschedule a booking?",
    answer:
      "Yes. You can cancel or reschedule according to the service provider's availability and cancellation policy.",
  },
  {
    question: "What if I'm not satisfied with the service?",
    answer:
      "You can report an issue through ServiGo, and our support team will review and resolve it promptly.",
  },
  {
    question: "Are there any hidden charges?",
    answer:
      "No. Pricing is transparent and shown upfront before you confirm your booking.",
  },
  {
    question: "Is ServiGo available in my city?",
    answer:
      "We are expanding to more locations. Check the app to see service coverage in your area.",
  },
]

function FaqCard({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: (typeof faqItems)[0]
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group flex w-full flex-col rounded-2xl border border-border bg-card p-6 text-left transition-colors",
        isOpen && "border-foreground/20 bg-foreground text-background"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-sm font-semibold text-secondary-foreground",
              isOpen && "bg-background/15 text-background"
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-base font-medium leading-snug">
            {item.question}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-background/60"
          )}
        />
      </div>
      <div
        className={cn(
          "grid transition-all duration-200",
          isOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p
            className={cn(
              "pl-12 text-sm leading-relaxed text-muted-foreground",
              isOpen && "text-background/70"
            )}
          >
            {item.answer}
          </p>
        </div>
      </div>
    </button>
  )
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="w-full bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-block rounded-full bg-secondary px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
            FAQ
          </span>
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            Got questions? We have answers.
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Everything you need to know before booking your first service.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {faqItems.map((item, index) => (
            <FaqCard
              key={index}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
            />
          ))}
        </div>
      </div>
    </section>
  )
}
