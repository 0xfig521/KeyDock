import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { FAQItem } from "@/components/FAQItem";

interface FaqItem {
  question: string;
  answer: string;
}

interface FAQProps {
  title?: string;
  items?: FaqItem[];
}

const defaultItems: FaqItem[] = [
  {
    question: "How is this different from .env files?",
    answer:
      "A .env file is tied to a single directory and easily scattered across projects, backups, and cloud storage. KeyDock keeps all your secrets in one encrypted vault and lets you define project boundaries through workspaces — so you never lose track of which key belongs where, and nothing is written to disk in plain text.",
  },
  {
    question: "Is it secure?",
    answer:
      "Your vault is encrypted with Argon2id key derivation and ChaCha20-Poly1305 authenticated encryption. The decryption key lives in application memory only while the vault is unlocked. KeyDock makes no network requests — your secrets never leave your machine.",
  },
  {
    question: "Does it work on macOS / Linux / Windows?",
    answer:
      "Yes. KeyDock is built with Tauri, so the desktop app runs on all three platforms. The CLI is a single Rust binary that works anywhere Rust targets are supported.",
  },
  {
    question: "Can I use it without the desktop app?",
    answer:
      "Absolutely. The CLI is self-contained — you can create workspaces, store secrets, activate environments, and run one-shot commands entirely from the terminal. The desktop app adds visual management, audit browsing, and quick-copy workflows on top.",
  },
  {
    question: "Do you offer cloud sync or team sharing?",
    answer:
      "Not yet. KeyDock is designed as a local-first tool. Cloud sync and team sharing are under consideration but would need to be optional and end-to-end encrypted. If these matter to you, star the repo and follow along.",
  },
  {
    question: "How do I migrate my existing .env files?",
    answer:
      "For now, migration is a manual process — create a workspace, add your keys, and link them to environment variables. We plan to ship an import command that reads .env files and scaffolds the workspace automatically.",
  },
  {
    question: "Can I use KeyDock in CI/CD pipelines?",
    answer:
      "Not yet, but it's on the roadmap. We plan to expose a local HTTP API that CI runners could query for secrets during a build. Until then, KeyDock is focused on local development workstation use.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: defaultItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export function FAQ({ title = "Frequently asked questions", items = defaultItems }: FAQProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      id="faq"
      ref={ref}
      className={cn(
        "py-16 md:py-24 transition-all duration-700",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0",
      )}
    >
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="mx-auto max-w-3xl px-4">
        <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h2>

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <FAQItem
              key={item.question}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
