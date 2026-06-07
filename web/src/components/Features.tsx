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
    title: "Your keys, encrypted on your machine. Period.",
    description:
      "KeyDock keeps every secret group and key entry in a local SQLite database encrypted with ChaCha20Poly1305. Your master password never leaves the Argon2id key derivation call. There is no cloud sync, no server endpoint - the encryption happens before anything touches disk.",
  },
  {
    icon: Layers,
    title: "One command. All your env vars in place.",
    description:
      "Define a workspace, map your secrets to environment variable names, then activate it. New shells inherit the mapped vars. Or skip the shell change and just run: keydock run startup -- bun run dev. No .env file to edit. No export statements.",
  },
  {
    icon: Monitor,
    title: "A visual home for your secrets.",
    description:
      "Built with Tauri and React, the KeyDock desktop app gives you a dashboard for all your secrets, a workspace manager for organizing env mappings, an audit timeline, and quick-copy formatting. Switch between app and terminal seamlessly.",
  },
  {
    icon: Eye,
    title: "Who revealed what. When. And how.",
    description:
      "Every sensitive action - revealing a secret value, copying to clipboard, exporting a key, creating or deleting entries - is logged with a timestamp in the audit trail. For teams that need to answer 'did anyone just leak the production token in a demo?', the audit log is the first place to check.",
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
            Why KeyDock?
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Four capabilities that change how you handle secrets every day.
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
