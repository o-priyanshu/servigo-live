import { Navbar } from "@/components/landing/navbar";
import { PopularServices } from "@/components/landing/popular-services";
import { PrimaryCta } from "@/components/landing/primary-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export default function ServicesPage() {
  return (
    <>
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-16" />
        <PopularServices />
        <PrimaryCta />
      </main>
      <SiteFooter />
    </>
  );
}

