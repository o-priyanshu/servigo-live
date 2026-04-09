import Link from "next/link"

export function PrimaryCta() {
  return (
    <section className="w-full bg-sage py-24 lg:py-32">
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 text-center">
        <h2 className="text-balance font-sans text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
          Book Verified Professionals with Confidence
        </h2>

        <p className="mt-4 text-base text-muted-foreground">
          Safe. Verified. Transparent pricing. No middlemen.
        </p>

        <Link
          href="/book"
          className="mt-10 inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Book a Service
        </Link>

        <p className="mt-6 text-sm text-muted-foreground">
          Are you a service professional?{" "}
          <Link
            href="/join"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Join ServiGo
          </Link>
        </p>
      </div>
    </section>
  )
}
