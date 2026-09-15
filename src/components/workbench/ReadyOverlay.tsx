import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

type Listener = (message: string) => void;

const listeners = new Set<Listener>();

/** Announce that a report/summary just became available. */
export function announceReady(message: string) {
  for (const listener of listeners) listener(message);
}

/**
 * Centre-screen confirmation that appears for two seconds whenever an analyst
 * report, detail report or executive summary lands.
 */
export function ReadyOverlay() {
  const [message, setMessage] = useState<string | null>(null);
  const queue = useRef<string[]>([]);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const show = (next: string) => {
      setMessage(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const following = queue.current.shift();
        if (following) show(following);
        else setMessage(null);
      }, 2000);
    };
    const listener: Listener = (next) => {
      if (message !== null) queue.current.push(next);
      else show(next);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!message) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center p-6"
      role="status"
      aria-live="polite"
    >
      <div className="animate-scale-in flex max-w-sm items-center gap-3 rounded-xl border border-rule bg-card/95 px-5 py-4 text-sm shadow-lg backdrop-blur motion-reduce:animate-none">
        <CheckCircle2 className="size-5 shrink-0 text-bull" aria-hidden="true" />
        <span className="font-medium break-words">{message}</span>
      </div>
    </div>
  );
}
