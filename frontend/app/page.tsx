/** Landing-page composition. ProjectShowcase now loads real posted projects. */
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { SkipLink } from "@/components/layout/skip-link";
import { AiAssistant } from "@/components/landing/ai-assistant";
import { Benefits } from "@/components/landing/benefits";
import { Discovery } from "@/components/landing/discovery";
import { Ecosystem } from "@/components/landing/ecosystem";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Impact } from "@/components/landing/impact";
import { Languages } from "@/components/landing/languages";
import { Pricing } from "@/components/landing/pricing";
import { ProjectShowcase } from "@/components/landing/project-showcase";
import { Showcase } from "@/components/landing/showcase";
import { Testimonials } from "@/components/landing/testimonials";
import { Trust } from "@/components/landing/trust";

export default function LandingPage() {
  return <>
    <SkipLink /><Navbar />
    <main id="main">
      <Hero /><Trust /><Discovery /><Features /><Showcase /><HowItWorks />
      <Benefits /><Ecosystem /><ProjectShowcase /><AiAssistant /><Languages />
      <Testimonials /><Impact /><Pricing /><Faq /><FinalCta />
    </main>
    <Footer />
  </>;
}
