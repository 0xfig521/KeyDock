import { useEffect, useState } from "react";

interface TerminalLine {
  text: string;
  type: "command" | "comment" | "empty";
}

const terminalLines: TerminalLine[] = [
  { text: "# Get your current active workspace", type: "comment" },
  { text: "keydock current", type: "command" },
  { text: "", type: "empty" },
  { text: "# Activate the workspace for new shells", type: "comment" },
  { text: "keydock activate startup", type: "command" },
  { text: "", type: "empty" },
  { text: "# Run a command with workspace env vars injected", type: "comment" },
  { text: "keydock run startup -- bun run dev", type: "command" },
  { text: "", type: "empty" },
  { text: "# Remove active workspace cache", type: "comment" },
  { text: "keydock deactivate", type: "command" },
];

const refTable: { command: string; description: string }[] = [
  {
    command: "keydock activate <workspace>",
    description: "Persist workspace env vars for new shells",
  },
  {
    command: "keydock deactivate",
    description: "Remove the active plaintext env cache",
  },
  {
    command: "keydock current",
    description: "Show the active workspace",
  },
  {
    command: "keydock hook <zsh|bash>",
    description: "Print shell hook code",
  },
  {
    command: "keydock list",
    description: "List workspaces and mapped env vars",
  },
  {
    command: "keydock open",
    description: "Open the KeyDock desktop app on macOS",
  },
  {
    command: "keydock run <workspace> -- <cmd>",
    description: "Run a command with workspace env vars",
  },
];

export function HowItWorks() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= terminalLines.length) return;
    const timer = setTimeout(
      () => setVisibleLines((prev) => prev + 1),
      350,
    );
    return () => clearTimeout(timer);
  }, [visibleLines]);

  const isStillTyping = visibleLines < terminalLines.length;

  return (
    <section id="how-it-works" className="bg-card/30 py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          How it works
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
          From vault to environment in two commands.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Terminal mockup - 3/5 width */}
          <div className="lg:col-span-3 rounded-xl overflow-hidden border border-border bg-[#0a0a0b]">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-[#0a0a0b] border-b border-border/50">
              <div className="size-3 rounded-full bg-red-500" />
              <div className="size-3 rounded-full bg-yellow-500" />
              <div className="size-3 rounded-full bg-green-500" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">
                terminal
              </span>
            </div>

            {/* Terminal content */}
            <div className="p-5 font-mono text-sm leading-relaxed min-h-[18rem]">
              {terminalLines.slice(0, visibleLines).map((line, i) => {
                if (line.type === "empty") return <div key={i}>&nbsp;</div>;
                if (line.type === "comment") {
                  return (
                    <div key={i} className="text-muted-foreground">
                      {line.text}
                    </div>
                  );
                }
                return (
                  <div key={i}>
                    <span className="text-green-500">$ </span>
                    <span className="text-foreground">{line.text}</span>
                  </div>
                );
              })}
              {isStillTyping && (
                <span className="inline-block w-2 h-4 bg-primary align-middle ml-0.5 animate-pulse" />
              )}
            </div>
          </div>

          {/* CLI Reference - 2/5 width */}
          <div className="lg:col-span-2 space-y-3">
            {refTable.map((entry) => (
              <div
                key={entry.command}
                className="rounded-lg bg-card border border-border p-3"
              >
                <code className="text-sm text-primary font-mono block mb-1">
                  {entry.command}
                </code>
                <p className="text-sm text-muted-foreground">
                  {entry.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
