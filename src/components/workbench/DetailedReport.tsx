import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markdownToHtml } from "@/lib/trading-agents/report";

function titleCase(value: string): string {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function valueToMarkdown(value: unknown, depth = 2): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const rendered = valueToMarkdown(item, depth + 1);
        return rendered ? `- ${rendered.replace(/\n/g, "\n  ")}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => {
      const rendered = valueToMarkdown(item, depth + 1);
      if (!rendered) return "";
      return `${"#".repeat(Math.min(depth, 4))} ${titleCase(key)}\n\n${rendered}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function readableArtifact(source: string): string {
  let text = source.trim();
  if (!text) return "";

  if (/^\s*<!doctype|^\s*<html|^\s*<body|^\s*<pre/i.test(text)) {
    const document = new DOMParser().parseFromString(text, "text/html");
    text = document.body.textContent?.trim() ?? text;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (typeof parsed === "string") {
        text = parsed.trim();
        continue;
      }
      return valueToMarkdown(parsed);
    } catch {
      break;
    }
  }

  return text
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/\\t/g, "  ")
    .replace(/\\"/g, '"')
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

export function DetailedReport({ url, ticker }: { url: string; ticker: string }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setSource("");

    fetch(url, { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Report unavailable");
        return response.text();
      })
      .then((text) => setSource(readableArtifact(text)))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [url]);

  const html = useMemo(() => markdownToHtml(source), [source]);
  const ready = Boolean(source) && !failed;

  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-rule bg-surface px-4 py-3 sm:px-5">
        <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Detailed report</h2>
          <p className={`mt-0.5 flex items-center gap-2 text-xs font-medium ${failed ? "text-bear" : ready ? "text-bull" : "text-primary"}`}>
            {loading && <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {failed ? "Could not load the formatted report" : ready ? "Available" : "Preparing report"}
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Original <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!ready}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          {open ? "Hide" : "Show"}
        </Button>
      </header>

      {ready && open && (
        <article
          aria-label={`${ticker} detailed analysis report`}
          className="prose-report max-h-[52rem] min-w-0 overflow-x-auto overflow-y-auto px-4 py-5 text-sm break-words sm:px-7 sm:py-7"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </section>
  );
}