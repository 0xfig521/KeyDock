import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItemProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export function FAQItem({ question, answer, defaultOpen = false }: FAQItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const buttonId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  useEffect(() => {
    setContentHeight(contentRef.current?.scrollHeight ?? 0);
  }, [answer, open]);

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium transition-colors hover:bg-primary/5"
        >
          <span>{question}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
        )}
        style={{
          maxHeight: open ? contentHeight : 0,
          opacity: open ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}
