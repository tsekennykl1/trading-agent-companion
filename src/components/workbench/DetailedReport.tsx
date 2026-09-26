import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Download, ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/trading-agents/client";
import { markdownToHtml } from "@/lib/trading-agents/report";
import { useT } from "@/lib/i18n";

function titleCase(value: string): string {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

const WRAPPER_KEYS = new Set(["body", "content", "data", "document", "html", "markdown", "report", "result", "text"]);

/** Machine-only sections: never useful to a reader of the report. */
const SYSTEM_KEYS = new Set([
  "artifacts",
  "artifact",
  "artifact_urls",
  "chart_urls",
  "urls",
  "raw",
  "raw_data",
  "rawdata",
  "raw_output",
  "raw_response",
  "raw_result",
  "metadata",
  "run_id",
  "runid",
  "logs",
  "log",
  "payload",
  "request",
]);

const isSystemKey = (key: string): boolean =>
  SYSTEM_KEYS.has(key.trim().toLowerCase().replace(/[\s-]+/g, "_"));

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptyValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isEmptyValue);
  return false;
}

function decodeQuotedValue(value: string): string {
  const trimmed = value.trim().replace(/,$/, "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith('"')) {
    try {
      return String(JSON.parse(trimmed));
    } catch {
      return trimmed.replace(/^"/, "").replace(/"$/, "").replace(/\\"/g, '"');
    }
  }
  return trimmed.replace(/^['"]|['"]$/g, "");
}

/** Recover readable content from Markdown mixed with incomplete JSON fragments. */
function cleanJsonLikeMarkdown(source: string): string {
  const output: string[] = [];
  // While > 0 we are inside a machine-only block and drop everything.
  let skipDepth = 0;

  for (const rawLine of source.split("\n")) {
    const trimmed = rawLine.trim();

    if (skipDepth > 0) {
      for (const character of trimmed) {
        if (character === "{" || character === "[") skipDepth += 1;
        else if (character === "}" || character === "]") skipDepth -= 1;
      }
      if (skipDepth < 0) skipDepth = 0;
      continue;
    }

    if (/^[{}\[\],]+$/.test(trimmed)) continue;

    const field = /^"?([A-Za-z][\w -]*)"?\s*:\s*(.*)$/.exec(trimmed);
    if (!field) {
      output.push(rawLine.replace(/",\s*$/, "").replace(/^"(?=[^"].*)|"$/g, ""));
      continue;
    }

    const key = field[1]?.trim() ?? "";
    const rawValue = field[2]?.trim() ?? "";
    if (!key || /^(?:""|''|null|undefined|\[\]|\{\})[,]?$/.test(rawValue)) continue;
    if (/^[{\[][,]?$/.test(rawValue)) {
      if (isSystemKey(key)) {
        skipDepth = 1;
        continue;
      }
      if (!WRAPPER_KEYS.has(key.toLowerCase())) output.push(`## ${titleCase(key)}`, "");
      continue;
    }
    if (isSystemKey(key)) continue;

    const decodedValue = decodeQuotedValue(rawValue);
    if (!decodedValue) continue;
    if (WRAPPER_KEYS.has(key.toLowerCase())) output.push(decodedValue, "");
    else output.push(`### ${titleCase(key)}`, "", decodedValue, "");
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}


function htmlToMarkdown(source: string): string {
  const document = new DOMParser().parseFromString(source, "text/html");
  // The engine's complete HTML repeats decision, chart, agent reports and
  // timings already present on the dashboard. Keep those in Original only.
  document.querySelectorAll("h2").forEach((heading) => {
    if (/Portfolio Decision|Price Chart|Agent Reports|Timings|Artifacts/i.test(heading.textContent ?? "")) {
      heading.closest(".card")?.remove();
    }
  });
  document.querySelectorAll("details, script, style").forEach((element) => element.remove());
  const blocks: string[] = [];

  document.querySelectorAll(".meta-item").forEach((element) => {
    const label = element.querySelector(".meta-label")?.textContent?.trim();
    const value = element.querySelector(".meta-value")?.textContent?.trim();
    if (label && value) blocks.push(`**${label}:** ${value}`);
    element.remove();
  });

  const renderInline = (element: Element): string =>
    Array.from(element.childNodes)
      .map((node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
        if (!(node instanceof Element)) return "";
        const text = renderInline(node);
        if (node.matches("strong, b")) return `**${text.trim()}**`;
        if (node.matches("em, i")) return `_${text.trim()}_`;
        if (node.matches("br")) return "\n";
        return text;
      })
      .join("")
      .trim();

  document.body.querySelectorAll("h1, h2, h3, h4, p, li, tr, pre").forEach((element) => {
    const text = renderInline(element);
    if (!text) return;
    if (/^H[1-4]$/.test(element.tagName)) {
      blocks.push(`${"#".repeat(Number(element.tagName.slice(1)))} ${text}`);
    } else if (element.tagName === "LI") {
      blocks.push(`- ${text}`);
    } else if (element.tagName === "TR") {
      const cells = Array.from(element.querySelectorAll(":scope > th, :scope > td")).map((cell) => renderInline(cell));
      if (cells.length) blocks.push(`| ${cells.join(" | ")} |`);
    } else {
      blocks.push(text);
    }
  });

  return blocks.join("\n\n").trim() || document.body.textContent?.trim() || source;
}

function decodeString(value: string, depth: number): string {
  let text = value.trim();
  if (!text || depth > 7) return text;

  text = text.replace(/^```(?:json|markdown|md|html)?\s*/i, "").replace(/\s*```$/, "").trim();

  if (/^\s*<!doctype|^\s*<html|^\s*<body|^\s*<article|^\s*<main|^\s*<pre/i.test(text)) {
    return decodeString(htmlToMarkdown(text), depth + 1);
  }

  if (/^[\[{\"]/.test(text)) {
    try {
      return valueToMarkdown(JSON.parse(text) as unknown, 2, depth + 1);
    } catch {
      // It is ordinary report text rather than encoded JSON.
    }
  }

  const decoded = text
    .replace(/\\r\\n|\\n/g, "\n")
    .replace(/\\t/g, "  ")
    .replace(/\\"/g, '"')
    .replace(/[ \t]+\\[ \t]*$/gm, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();

  return cleanJsonLikeMarkdown(decoded);
}

function valueToMarkdown(value: unknown, headingDepth = 2, decodeDepth = 0): string {
  if (typeof value === "string") return decodeString(value, decodeDepth);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    const primitiveList = value.every((item) => typeof item !== "object" || item === null);
    return value
      .map((item, index) => {
        const rendered = valueToMarkdown(item, headingDepth + 1, decodeDepth + 1);
        if (!rendered) return "";
        return primitiveList ? `- ${rendered.replace(/\n/g, "\n  ")}` : `### Item ${index + 1}\n\n${rendered}`;
      })
      .filter(Boolean)
      .join(primitiveList ? "\n" : "\n\n");
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key, item]) => !isEmptyValue(item) && !isSystemKey(key),
  );

  if (entries.length === 1) {
    const [key, item] = entries[0] ?? [];
    if (key && WRAPPER_KEYS.has(key.toLowerCase())) return valueToMarkdown(item, headingDepth, decodeDepth + 1);
  }

  return entries
    .map(([key, item]) => {
      const rendered = valueToMarkdown(item, headingDepth + 1, decodeDepth + 1);
      if (!rendered) return "";
      return `${"#".repeat(Math.min(headingDepth, 4))} ${titleCase(key)}\n\n${rendered}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

/** Drop Markdown/HTML sections whose headings are machine-only (Artifacts, Raw Result, etc.). */
function stripSystemSections(source: string): string {
  const lines = source.split("\n");
  const output: string[] = [];
  let skipLevel = 0;

  for (const rawLine of lines) {
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(rawLine);
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 0;
      const title = headingMatch[2]?.trim() ?? "";
      if (isSystemKey(title)) {
        skipLevel = level;
        continue;
      }
      if (skipLevel > 0 && level <= skipLevel) {
        skipLevel = 0;
      }
    }
    if (skipLevel === 0) {
      output.push(rawLine);
    }
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function readableArtifact(source: string): string {
  return stripSystemSections(cleanJsonLikeMarkdown(decodeString(source, 0)));
}

/** `/runs/<id>/result.html` → `<id>`, so we can fall back to the report files. */
function runIdFromUrl(url: string): string | null {
  const match = /\/runs\/([^/?#]+)\//.exec(url);
  return match?.[1] ?? null;
}

/** Stitch whatever individual reports the engine has into one Markdown document. */
async function reportsFallback(url: string): Promise<string> {
  const runId = runIdFromUrl(url);
  if (!runId) return "";
  const index = await api.reportsIndex(runId).catch(() => null);
  if (!index || index.names.length === 0) return "";

  const sections = await Promise.all(
    index.names.map(async (name) => {
      const body = index.contents[name] ?? (await api.report(runId, name).catch(() => null));
      return body ? `## ${titleCase(name)}\n\n${readableArtifact(body)}` : "";
    }),
  );
  return sections.filter(Boolean).join("\n\n").trim();
}

export function DetailedReport({
  url,
  ticker,
  expanded = false,
  onContent,
  onLoadingChange,
}: {
  url: string;
  ticker: string;
  /** Rendered on its own page: always open, no collapse control. */
  expanded?: boolean;
  /** Receives the cleaned Markdown so a parent can offer downloads. */
  onContent?: (markdown: string) => void;
  /** Notifies the parent when the loading state changes. */
  onLoadingChange?: (loading: boolean) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(expanded);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reason, setReason] = useState("");
  const [attempt, setAttempt] = useState(0);
  const publish = useRef(onContent);
  publish.current = onContent;
  const notifyLoading = useRef(onLoadingChange);
  notifyLoading.current = onLoadingChange;

  useEffect(() => {
    notifyLoading.current?.(loading);
  }, [loading]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setReason("");
    setSource("");
    publish.current?.("");

    const finish = (markdown: string) => {
      if (cancelled) return false;
      const cleaned = markdown.trim();
      if (!cleaned) return false;
      setSource(cleaned);
      publish.current?.(cleaned);
      return true;
    };

    (async () => {
      let problem = "";
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`The engine answered ${response.status} for this report`);
        if (finish(readableArtifact(await response.text()))) return;
        problem = "The report file is empty";
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        problem = error instanceof Error ? error.message : "The report could not be reached";
      }

      // Fall back to the individual report files the engine already published.
      const stitched = await reportsFallback(url).catch(() => "");
      if (finish(stitched)) return;
      if (cancelled) return;
      setReason(problem);
      setFailed(true);
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, attempt]);

  const html = useMemo(() => markdownToHtml(source), [source]);
  const ready = Boolean(source) && !failed;
  const runId = runIdFromUrl(url);
  const artifactBase = runId ? url.slice(0, url.indexOf(`/runs/${runId}/`) + `/runs/${runId}/`.length) : null;
  const artifacts = artifactBase ? [
    { filename: "market-data.json", label: "Market Data (JSON)" },
    { filename: "price-chart.json", label: "Price Chart (JSON)" },
    { filename: "price-chart.png", label: "Price Chart (PNG)" },
    { filename: "price-chart.html", label: "Price Chart (Interactive)" },
  ] : [];

  const downloadArtifact = async (filename: string) => {
    if (!artifactBase) return;
    const artifactUrl = `${artifactBase}${filename}`;
    try {
      const response = await fetch(artifactUrl);
      if (!response.ok) throw new Error("Artifact unavailable");
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${ticker || runId}-${filename}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      window.open(artifactUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-rule bg-surface px-4 py-3 sm:px-5">
        <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{t("report.title")}</h2>
          <p className={`mt-0.5 flex items-center gap-2 text-xs font-medium ${failed ? "text-bear" : ready ? "text-bull" : "text-primary"}`}>
            {loading && <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {failed ? t("report.failed") : ready ? t("report.available") : t("report.loading")}
          </p>
        </div>
        <Button asChild size="sm" variant="default" className="min-h-10 gap-2 px-4 font-semibold shadow-sm">
          <a href={url} target="_blank" rel="noreferrer">
            {t("report.original")} <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
        {failed && (
          <Button type="button" size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            <RefreshCw className="size-3.5" aria-hidden="true" /> {t("report.retry")}
          </Button>
        )}
        {!expanded && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!ready}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
            {open ? t("reports.hide") : t("reports.show")}
          </Button>
        )}
      </header>

      {failed && (
        <div className="space-y-1 px-4 py-4 text-xs text-muted-foreground sm:px-5">
          {reason && <p>{reason}</p>}
          <p className="break-all">{url}</p>
        </div>
      )}

      {ready && open && (
        <>
          <article
            aria-label={`${ticker} detailed analysis report`}
            className={`prose-report report-columns min-w-0 overflow-x-auto px-4 py-5 text-sm break-words sm:px-6 sm:py-6 ${expanded ? "" : "max-h-[44rem] overflow-y-auto"}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {artifactBase && (
            <div className="border-t border-rule px-4 py-5 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {artifacts.map(({ filename, label }) => (
                  <Button key={filename} type="button" variant="outline" size="sm" className="gap-2" onClick={() => void downloadArtifact(filename)}>
                    <Download className="size-4" aria-hidden="true" /> {label}
                  </Button>
                ))}
              </div>
              <img
                src={`${artifactBase}price-chart.png`}
                alt={`${ticker} price chart`}
                loading="lazy"
                className="mt-4 max-h-[42rem] w-full object-contain"
                onError={(event) => { event.currentTarget.hidden = true; }}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}