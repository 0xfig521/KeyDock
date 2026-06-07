import { Star, Download } from "lucide-react";

interface SocialProofProps {
  quote: string;
  attribution: string;
  stars: number;
  downloads: number;
}

export function SocialProof({
  quote,
  attribution,
  stars,
  downloads,
}: SocialProofProps) {
  return (
    <section className="border-t border-border bg-card/50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <blockquote className="text-lg italic text-foreground/90 leading-relaxed">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <cite className="mt-4 block not-italic text-sm text-muted-foreground">
          — {attribution}
        </cite>

        <div className="mt-8 flex items-center justify-center gap-10 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 text-primary fill-current" />
            <span className="font-semibold text-foreground">
              {stars.toLocaleString()}
            </span>{" "}
            stars
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Download className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">
              {downloads.toLocaleString()}
            </span>{" "}
            downloads
          </span>
        </div>
      </div>
    </section>
  );
}
