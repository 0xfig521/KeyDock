import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { SocialProof } from "@/components/SocialProof";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { SecurityModel } from "@/components/SecurityModel";
import { UseCases } from "@/components/UseCases";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

function App() {
  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "KeyDock",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "macOS, Windows, Linux",
            description:
              "Local-first encrypted secret management for developers. Store API keys, cloud tokens, and project env vars in a local encrypted vault.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />

      <Navigation />
      <Hero
        primaryCta={{ label: "Download for free", href: "/download" }}
        secondaryCta={{ label: "View on GitHub", href: "https://github.com/0xfig-labs/KeyDock" }}
        screenshotSrc="/hero-screenshot.png"
      />
      <SocialProof
        quote="Switching between AI API providers used to mean hunting through .bash_history for that one key export. Now it is one `keydock activate`."
        attribution="Developer, early adopter"
        stars={500}
        downloads={2000}
      />
      <Features />
      <HowItWorks />
      <SecurityModel />
      <UseCases />
      <Pricing
        features={[
          "Unlimited secrets",
          "Unlimited workspaces",
          "All CLI commands",
          "Audit log",
          "Shell integration",
          "Presets",
        ]}
        primaryCta={{ label: "Download on GitHub", href: "https://github.com/0xfig-labs/KeyDock" }}
        secondaryCta={{ label: "Star on GitHub", href: "https://github.com/0xfig-labs/KeyDock" }}
      />
      <FAQ />
      <Footer />
    </>
  );
}

export { App };
