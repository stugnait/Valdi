import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { PainSection } from "@/components/landing/pain-section"
import { FeaturesGrid } from "@/components/landing/features-grid"
import { SocialProof } from "@/components/landing/social-proof"
import { CtaSection } from "@/components/landing/cta-section"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <PainSection />
      <FeaturesGrid />
      <SocialProof />
      <CtaSection />
    </main>
  )
}
