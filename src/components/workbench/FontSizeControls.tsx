import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ta-font-scale";
const SCALES = [0.9, 1, 1.1, 1.2, 1.35, 1.5] as const;

function savedScale(): number {
  if (typeof window === "undefined") return 1;
  const value = Number(window.localStorage.getItem(STORAGE_KEY));
  return SCALES.includes(value as (typeof SCALES)[number]) ? value : 1;
}

/** Changes the root rem size so the complete interface scales consistently. */
export function FontSizeControls() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(savedScale());
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${scale * 100}%`;
    window.localStorage.setItem(STORAGE_KEY, String(scale));
  }, [scale]);

  const index = SCALES.indexOf(scale as (typeof SCALES)[number]);

  return (
    <div className="flex shrink-0 items-center rounded-md border border-rule bg-surface p-0.5" role="group" aria-label="Font size">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={index <= 0}
        title="Decrease font size"
        aria-label="Decrease font size"
        onClick={() => setScale(SCALES[Math.max(0, index - 1)] ?? 1)}
      >
        <Minus className="size-3.5" aria-hidden="true" />
        <span className="sr-only">A</span>
      </Button>
      <span className="min-w-7 text-center text-xs font-semibold" aria-hidden="true">A</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={index >= SCALES.length - 1}
        title="Increase font size"
        aria-label="Increase font size"
        onClick={() => setScale(SCALES[Math.min(SCALES.length - 1, index + 1)] ?? 1)}
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}