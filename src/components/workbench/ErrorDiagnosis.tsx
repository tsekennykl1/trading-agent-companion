// "Explain this error" panel: paste an analysis error or run log and an AI
// model explains what failed and which settings to change.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { diagnoseError } from "@/lib/diagnose.functions";

export function ErrorDiagnosis({ initialLog = "", context }: { initialLog?: string; context?: string }) {
  const diagnose = useServerFn(diagnoseError);
  const [log, setLog] = useState(initialLog);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Pre-fill with the latest engine error when one appears.
  useEffect(() => {
    if (initialLog) setLog(initialLog);
  }, [initialLog]);

  const run = async () => {
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const res = await diagnose({ data: { log, context } });
      setAnswer(res.markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel space-y-3 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Stethoscope className="size-5 text-primary" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold">Explain an error / 解釋錯誤</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Paste an analysis error or run log. AI will explain the failure and suggest corrected settings.
      </p>
      <Textarea
        value={log}
        onChange={(e) => setLog(e.target.value)}
        placeholder="Paste the error message or server log here…"
        className="min-h-32 font-mono text-xs"
        maxLength={20000}
      />
      <Button onClick={run} disabled={busy || !log.trim()} className="gap-2">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Stethoscope className="size-4" aria-hidden="true" />}
        {busy ? "Analysing…" : "Explain & recommend fix"}
      </Button>
      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
      {answer && (
        <div className="prose prose-sm max-w-none break-words rounded-md border border-rule bg-muted/30 p-4 text-sm [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}
