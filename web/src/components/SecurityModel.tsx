import { Shield, KeyRound, Lock, Eye, FileWarning } from "lucide-react";

interface SecurityCard {
  icon: typeof Shield;
  label: string;
  title: string;
  description: string;
}

const securityCards: SecurityCard[] = [
  {
    icon: KeyRound,
    label: "Key derivation",
    title: "Argon2id",
    description:
      "Your master password is stretched through Argon2id before any key material is derived. Brute-force resistance is built into the protocol.",
  },
  {
    icon: Shield,
    label: "Encryption",
    title: "ChaCha20Poly1305",
    description:
      "All secret data is encrypted with ChaCha20Poly1305 before touching disk. The data-encryption key is itself wrapped by the derived master key.",
  },
  {
    icon: Lock,
    label: "Memory",
    title: "In-memory only",
    description:
      "The unwrapped data-encryption key exists only in application heap memory while the vault is unlocked. It is never written to disk or swap.",
  },
  {
    icon: Eye,
    label: "Audit",
    title: "Local and short-lived",
    description:
      "Workspace activation writes a plaintext env cache so new shells can load mapped variables. Treat these caches like any other shell secret: convenient, local, and intentionally short-lived.",
  },
];

export function SecurityModel() {
  return (
    <section id="security" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          Built for the paranoid. Auditable by design.
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
          KeyDock is designed as a local-first vault. Your secrets never leave
          your machine unless you explicitly choose to export them.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {securityCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl bg-card border border-border p-5 flex gap-4 hover:border-primary/30 hover:-translate-y-0.5 transition-all"
            >
              <div className="size-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                <card.icon className="size-5 text-primary" />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                <h3 className="text-base font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-destructive/5 border border-destructive/20 p-4 flex gap-3 rounded-xl">
          <FileWarning className="size-5 shrink-0 mt-0.5 text-destructive" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            A local attacker with code execution on your machine can read vault
            contents while the app has it unlocked - just like they can read any
            other application's memory. KeyDock does not protect against local
            code execution. The root trust anchor is your master password and the
            physical security of your machine.
          </p>
        </div>
      </div>
    </section>
  );
}
