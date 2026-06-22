"use client";

import { useState } from "react";
import { postJSON } from "@/lib/api";
import type { GradeResult } from "@/lib/ai";
import type { LangCode, Cefr } from "@/lib/languages";
import { Card, LinkButton } from "./ui";
import { GradeFeedback } from "./GradeFeedback";

type Prompt = { prompt: string; guidance: string; level: Cefr };

export function WritingSession({ lang, level }: { lang: LangCode; level: Cefr }) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);

  async function getPrompt() {
    setBusy(true);
    setError(null);
    setResult(null);
    setResponse("");
    try {
      const data = await postJSON<Prompt>("/api/writing/prompt", {
        language: lang,
        topic: topic.trim() || undefined,
      });
      setPrompt(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function grade() {
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postJSON<GradeResult>("/api/writing/grade", {
        language: lang,
        prompt: prompt.prompt,
        response,
      });
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const words = response.trim() ? response.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      {!prompt && (
        <Card className="p-5">
          <label className="text-sm text-muted">Theme (optional)</label>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. an opinion piece, a letter, a description…"
              className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
            />
            <button
              onClick={getPrompt}
              disabled={busy}
              className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
            >
              {busy ? "Generating…" : `Get a ${level} prompt`}
            </button>
          </div>
        </Card>
      )}

      {error && <Card className="p-4 text-sm text-negative border-negative/40">{error}</Card>}
      {result && <GradeFeedback result={result} />}

      {prompt && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wide text-brand mb-1">Prompt</div>
            <p className="text-[15px] mb-2">{prompt.prompt}</p>
            <p className="text-xs text-muted">💡 {prompt.guidance}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted">Your response</span>
              <span className="text-xs text-muted">{words} words</span>
            </div>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={!!result}
              rows={10}
              placeholder="Write here…"
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-brand"
            />
          </Card>

          <div className="flex gap-3">
            {!result ? (
              <button
                onClick={grade}
                disabled={busy || !response.trim()}
                className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
              >
                {busy ? "Grading…" : "Submit for grading"}
              </button>
            ) : (
              <button
                onClick={() => {
                  setPrompt(null);
                  setResult(null);
                }}
                className="bg-surface-2 hover:bg-border rounded-xl px-5 py-2.5 text-sm font-medium"
              >
                New prompt
              </button>
            )}
            <LinkButton href={`/?lang=${lang}`} variant="ghost">
              Back
            </LinkButton>
          </div>
        </div>
      )}
    </div>
  );
}
