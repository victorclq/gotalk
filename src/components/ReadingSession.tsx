"use client";

import { useState } from "react";
import { postJSON } from "@/lib/api";
import type { GradeResult } from "@/lib/ai";
import type { LangCode, Cefr } from "@/lib/languages";
import { Card, LinkButton } from "./ui";
import { GradeFeedback } from "./GradeFeedback";

type Reading = {
  exerciseId: number;
  title: string;
  level: Cefr;
  passage: string;
  questions: { id: number; prompt: string }[];
};

export function ReadingSession({ lang, level }: { lang: LangCode; level: Cefr }) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    setResponse("");
    try {
      const data = await postJSON<Reading>("/api/reading/generate", {
        language: lang,
        topic: topic.trim() || undefined,
      });
      setReading(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function grade() {
    if (!reading) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postJSON<GradeResult>("/api/reading/grade", {
        exerciseId: reading.exerciseId,
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

  return (
    <div className="space-y-6">
      {!reading && (
        <Card className="p-5">
          <label className="text-sm text-muted">Topic (optional)</label>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. history, science, a short story…"
              className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
            />
            <button
              onClick={generate}
              disabled={busy}
              className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
            >
              {busy ? "Generating…" : `Generate ${level} passage`}
            </button>
          </div>
        </Card>
      )}

      {error && <Card className="p-4 text-sm text-negative border-negative/40">{error}</Card>}
      {result && <GradeFeedback result={result} />}

      {reading && (
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="font-medium text-lg mb-3">{reading.title}</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{reading.passage}</p>
          </Card>

          <Card className="p-5">
            <div className="text-sm text-muted mb-2">
              In your own words (in {lang === "es" ? "Spanish" : lang === "it" ? "Italian" : "French"}),
              explain what you understood. Address these where you can:
            </div>
            <ul className="text-sm list-disc pl-5 mb-3 space-y-1 text-muted">
              {reading.questions.map((q) => (
                <li key={q.id}>{q.prompt}</li>
              ))}
            </ul>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={!!result}
              rows={7}
              placeholder="Write your understanding here…"
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
                {busy ? "Evaluating…" : "Submit for evaluation"}
              </button>
            ) : (
              <button
                onClick={() => {
                  setReading(null);
                  setResult(null);
                }}
                className="bg-surface-2 hover:bg-border rounded-xl px-5 py-2.5 text-sm font-medium"
              >
                New passage
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
