import { type LucideIcon, Shield, Layers, Monitor, Eye } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

interface FeatureBlockProps {
  icon: LucideIcon;
  title: string;
  description: string;
  imagePosition: "left" | "right";
  index: number;
}

const features: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: Shield,
    title: "A local encrypted vault for real developer secrets.",
    description:
      "KeyDock stores API keys, tokens, base URLs, account IDs, and other service fields in a local SQLite vault encrypted with ChaCha20Poly1305. Your master password stays on your machine and drives Argon2id key derivation before secret data is written to disk.",
  },
  {
    icon: Layers,
    title: "Composable presets instead of scattered .env files.",
    description:
      "Create reusable presets from services like OpenAI, Anthropic, Cloudflare, Vercel, Supabase, or Stripe. Compose presets together, map secret fields to env names, and activate one trusted environment for every new terminal.",
  },
  {
    icon: Monitor,
    title: "A desktop control center for secrets and presets.",
    description:
      "The Tauri + React app gives you a dashboard for secrets, preset composition, encrypted field editing, audit history, and quick-copy flows. Use the app for structure and the CLI for fast terminal context switches.",
  },
  {
    icon: Eye,
    title: "Command-scoped access with local auditability.",
    description:
      "Reveal, copy, export, preset activation, and secret mutations are recorded in a local audit trail. For AI-assisted workflows, prefer one-shot `keydock run` injection so an agent or script receives only the env vars needed for that command.",
  },
];

function FeatureBlock({
  icon: Icon,
  title,
  description,
  imagePosition,
  index,
}: FeatureBlockProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center mb-16 md:mb-24 last:mb-0",
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
      )}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {imagePosition === "right" && (
        <div>
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="size-5 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl h-48 md:h-64 flex items-center justify-center text-muted-foreground">
        Feature illustration
      </div>
      {imagePosition === "left" && (
        <div>
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="size-5 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-16 md:py-24 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Why KeyDock fits modern development
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            A safer daily loop for developers who switch models, clouds, clients, and terminals all day.
          </p>
        </div>
        {features.map((feature, i) => (
          <FeatureBlock
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            imagePosition={i % 2 === 0 ? "right" : "left"}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
