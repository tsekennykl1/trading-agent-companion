import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_TONE = { className: "bg-muted text-muted-foreground border-rule", Icon: Minus };

const DECISION_TONES: Record<string, typeof DEFAULT_TONE> = {
  Buy: { className: "bg-bull/12 text-bull border-bull/30", Icon: ArrowUpRight },
  Overweight: { className: "bg-bull/12 text-bull border-bull/30", Icon: ArrowUpRight },
  Hold: { className: "bg-neutral/12 text-neutral border-neutral/30", Icon: Minus },
  Review: DEFAULT_TONE,
  Underweight: { className: "bg-bear/12 text-bear border-bear/30", Icon: ArrowDownRight },
  Sell: { className: "bg-bear/12 text-bear border-bear/30", Icon: ArrowDownRight },
};

/** The shared Buy, Hold, or Sell label used by both decision views. */
export function DecisionBadge({ action, large = false }: { action: string; large?: boolean }) {
  const tone = DECISION_TONES[action] ?? DEFAULT_TONE;
  const Icon = tone.Icon;

  return (
    <span
      className={cn(
        "flex w-fit shrink-0 items-center rounded-md border font-display font-semibold",
        large ? "gap-2 px-3 py-1.5 text-xl" : "gap-1.5 px-2.5 py-1 text-lg",
        tone.className,
      )}
    >
      <Icon className={large ? "size-5" : "size-4"} aria-hidden="true" />
      {action}
    </span>
  );
}