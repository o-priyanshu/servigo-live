import Image from "next/image"

const testimonials = [
  {
    quote: "Booking a verified professional made me feel much safer inviting someone into my home.",
    name: "Rohan",
    role: "Customer",
    image: "/images/testimonial-rohan.jpg",
  },
  {
    quote: "ServiGo helped me find regular work without dealing with middlemen.",
    name: "Suresh",
    role: "Service Professional",
    category: "Electrician",
    image: "/images/testimonial-suresh.jpg",
  },
  {
    quote: "I needed a plumber on short notice and the entire process was straightforward and reliable.",
    name: "Priya",
    role: "Customer",
    image: "/images/testimonial-priya.jpg",
  },
  {
    quote: "The app made it so easy to schedule AC servicing. I got reminders and the technician arrived on time.",
    name: "Anita",
    role: "Customer",
    image: "/images/testimonial-anita.jpg",
  },
  {
    quote: "I switched to ServiGo from word-of-mouth referrals. My client base has grown steadily since.",
    name: "Vikram",
    role: "Service Professional",
    category: "Carpenter",
    image: "/images/testimonial-vikram.jpg",
  },
  {
    quote: "What I appreciate most is the transparent pricing. No surprises when the job is done.",
    name: "Meera",
    role: "Customer",
    image: "/images/testimonial-meera.jpg",
  },
  {
    quote: "Getting verified on the platform was simple and it immediately built trust with new customers.",
    name: "Arjun",
    role: "Service Professional",
    category: "Plumber",
    image: "/images/testimonial-arjun.jpg",
  },
  {
    quote: "I used ServiGo for pest control and deep cleaning before moving into my new flat. Both services were excellent.",
    name: "Deepa",
    role: "Customer",
    image: "/images/testimonial-deepa.jpg",
  },
]

export function SocialProof() {
  return (
    // Updated bg-[hsl...] to simply bg-warm
    <section className="w-full bg-warm py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            Trusted by Customers & Professionals
          </h2>
          <p className="mt-4 text-sm text-muted-foreground lg:text-lg">
            Real experiences from people using ServiGo.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              // Added shadow-sm for depth and hover effect for interactivity
              className="flex flex-col items-start rounded-2xl border border-border bg-card px-6 py-8 shadow-sm transition-all hover:shadow-md"
            >
              <blockquote className="flex-1">
                <p className="text-[15px] leading-relaxed text-foreground/90">
                  {`"${testimonial.quote}"`}
                </p>
              </blockquote>

              <div className="mt-8 flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border">
                  <Image
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    {testimonial.role}
                    {testimonial.category && (
                      <span className="text-foreground/50">{` • ${testimonial.category}`}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}