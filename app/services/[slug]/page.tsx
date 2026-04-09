import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/landing/navbar";
import { SiteFooter } from "@/components/landing/site-footer";

const SERVICE_LABELS: Record<string, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  cleaning: "Home Cleaning",
  maid: "Maid",
  driver: "Driver",
  carpenter: "Carpenter",
};

interface ServiceDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { slug } = await params;
  const title = SERVICE_LABELS[slug];
  if (!title) notFound();

  return (
    <>
      <main className="min-h-screen bg-background">
        <Navbar />
        <section className="mx-auto max-w-5xl px-6 pt-28 pb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Service</p>
          <h1 className="mt-2 text-4xl font-bold text-foreground">{title}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Browse verified {title.toLowerCase()} professionals and book securely.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth/login" className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background">
              Login to Continue
            </Link>
            <Link href="/services" className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground">
              Back to Services
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

