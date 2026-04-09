import { Faq } from "@/components/landing/faq";
import { ForWorkers } from "@/components/landing/for-workers";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { PopularServices } from "@/components/landing/popular-services";
import { PrimaryCta } from "@/components/landing/primary-cta";
import { SiteFooter } from "@/components/landing/site-footer";
import { SocialProof } from "@/components/landing/social-proof";
import { TrustVerification } from "@/components/landing/trust-verification";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <PopularServices />
      <HowItWorks />
      <TrustVerification />
      <SocialProof />
      <ForWorkers />
      <Faq />
      <PrimaryCta />
      <SiteFooter />
    </main>
  );
}
