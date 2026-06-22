"use client";

import { useState } from "react";
import { postJSON } from "@/lib/api";
import type { GradeResult } from "@/lib/ai";
import type { LangCode, Cefr } from "@/lib/languages";
import { Card, LinkButton } from "./ui";
import { GradeFeedback } from "./GradeFeedback";

type ClientItem = {
  id: number;
  kind: "multiple_choice" | "fill_blank" | "transform" | "translate";
  prompt: string;
  options: string[] | null;
};
type GenResponse = { exerciseId: number; title: string; level: Cefr; items: ClientItem[] };

const KIND_LABEL: Record<ClientItem["kind"], string> = {
  multiple_choice: "Choose",
  fill_blank: "Fill the blank",
  transform: "Transform",
  translate: "Translate",
};

export function GrammarSession({ lang, level }: { lang: LangCode; level: Cefr }) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [set, setSet] = useState<GenResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<GradeResult | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    setAnswers({});
    try {
      const data = await postJSON<GenResponse>("/api/exercises/generate", {
        language: lang,
        skill: "grammar",
        topic: topic.trim() || undefined,
      });
      setSet(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function grade() {
    if (!set) return;
    setBusy(true);
    setError(null);
    try {
      const data = await postJSON<GradeResult>("/api/exercises/grade", {
        exerciseId: set.exerciseId,
        answers,
      });
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const answeredCount = Object.values(answers).filter((v) => v?.trim()).length;

  return (
    <div className="space-y-6">
      {!set && (
        <Card className="p-5">
          <label className="text-sm text-muted">Topic (optional)</label>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. subjunctive, past tenses, ser vs estar…"
              className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
            />
            <button
              onClick={generate}
              disabled={busy}
              className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
            >
              {busy ? "Generating…" : `Generate ${level} set`}
            </button>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 text-sm text-negative border-negative/40">{error}</Card>
      )}

      {result && <GradeFeedback result={result} />}

      {set && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{set.title}</h2>
            {!result && (
              <span className="text-xs text-muted">
                {answeredCount}/{set.items.length} answered
              </span>
            )}
          </div>

          {set.items.map((it, idx) => (
            <Card key={it.id} className="p-4">
              <div className="text-xs uppercase tracking-wide text-brand mb-1">
                {idx + 1}. {KIND_LABEL[it.kind]}
              </div>
              <p className="text-sm whitespace-pre-wrap mb-3">{it.prompt}</p>

              {it.kind === "multiple_choice" && it.options ? (
                <div className="grid gap-2">
                  {it.options.map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                        answers[it.id] === opt
                          ? "border-brand bg-brand/10"
                          : "border-border hover:bg-surface-2"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${it.id}`}
                        value={opt}
                        checked={answers[it.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [it.id]: opt }))}
                        disabled={!!result}
                        className="accent-[var(--brand)]"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  value={answers[it.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [it.id]: e.target.value }))}
                  disabled={!!result}
                  placeholder="Your answer…"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-brand"
                />
              )}
            </Card>
          ))}

          <div className="flex gap-3">
            {!result ? (
              <button
                onClick={grade}
                disabled={busy || answeredCount === 0}
                className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
              >
                {busy ? "Grading…" : "Submit for grading"}
              </button>
            ) : (
              <button
                onClick={() => {
                  setSet(null);
                  setResult(null);
                }}
                className="bg-surface-2 hover:bg-border rounded-xl px-5 py-2.5 text-sm font-medium"
              >
                New set
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
