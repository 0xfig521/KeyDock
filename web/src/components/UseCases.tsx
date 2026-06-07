import type { LucideIcon } from "lucide-react";
import { Cpu, Cloud, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface UseCase {
  icon: LucideIcon;
  title: string;
  description: string;
}

const defaultCases: UseCase[] = [
  {
    icon: Cpu,
    title: "AI workflow builders",
    description:
      "Switch between OpenRouter, DeepSeek, Anthropic, and OpenAI without touching .env files. Keep provider keys organized per project and activate the right set in seconds.",
  },
  {
    icon: Cloud,
    title: "Cloud engineers",
    description:
      "Manage staging, production, and ephemeral sandbox credentials side by side. Map each environment's API tokens and account IDs to the right workspace — no more copy-paste errors.",
  },
  {
    icon: Briefcase,
    title: "Freelancers & agency devs",
    description:
      "Juggle multiple clients without cross-contaminating secrets. Each client gets its own workspace with isolated env mappings, and you switch context instantly from the CLI.",
  },
];

interface UseCasesProps {
  cases?: UseCase[];
}

export function UseCases({ cases = defaultCases }: UseCasesProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className={cn(
        "py-16 md:py-24 transition-all duration-700",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0",
      )}
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight md:text-4xl">
          Built for the way you work
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cases.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="group relative overflow-hidden rounded-xl bg-card border border-border p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                {/* Watermark background treatment */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 20%, currentColor, transparent 60%)",
                  }}
                />

                <div className="relative">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="mb-2 font-semibold">{item.title}</h3>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
