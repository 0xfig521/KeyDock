import type { ReactNode } from "react";
import { Shield, Monitor, Terminal } from "lucide-react";

interface TrustMarker {
  Icon?: React.ComponentType<{ className?: string }>;
  label: string;
}

interface HeroProps {
  headline?: ReactNode;
  subheadline?: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  screenshotSrc: string;
}

const trustMarkers: TrustMarker[] = [
  { Icon: Shield, label: "Local encrypted" },
  { label: "MIT Licensed" },
  { Icon: Monitor, label: "macOS · Linux · Windows" },
  { Icon: Terminal, label: "CLI included" },
];

const defaultHeadline = (
  <>
    Your secrets don't live in{" "}
    <span className="text-primary">.env files</span> anymore.
  </>
);

const defaultSubheadline =
  "KeyDock turns scattered API keys, cloud tokens, and project-specific env vars into a local encrypted workspace you can activate from desktop or CLI.";

export function Hero({
  headline = defaultHeadline,
  subheadline = defaultSubheadline,
  primaryCta,
  secondaryCta,
  screenshotSrc,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-28 md:pt-36 pb-16 md:pb-24">
      {/* Decorative gradient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-60 -right-40 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] opacity-40 max-lg:hidden"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text side */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-foreground">
              {headline}
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
              {subheadline}
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
              <a
                href={primaryCta.href}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/25"
              >
                {primaryCta.label}
              </a>
              <a
                href={secondaryCta.href}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
              >
                {secondaryCta.label}
              </a>
            </div>

            {/* Trust markers */}
            <div className="mt-10 grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {trustMarkers.map((marker) => (
                <span
                  key={marker.label}
                  className="inline-flex items-center gap-1.5"
                >
                  {marker.Icon && <marker.Icon className="h-4 w-4 text-primary" />}
                  {marker.label}
                </span>
              ))}
            </div>
          </div>

          {/* Screenshot side */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm sm:max-w-lg">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-4 rounded-2xl bg-primary/10 blur-2xl opacity-60"
              />
              <img
                src={screenshotSrc}
                alt="KeyDock screenshot"
                className="relative rounded-xl border border-border shadow-2xl float-animation w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .float-animation {
          animation: float 5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .float-animation {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
