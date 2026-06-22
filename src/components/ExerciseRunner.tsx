"use client";

import { useState } from "react";
import { postJSON } from "@/lib/api";
import type { GradeResult } from "@/lib/ai";
import { Card } from "./ui";
import { GradeFeedback } from "./GradeFeedback";

export type ClientItem = {
  id: number;
  kind: "multiple_choice" | "fill_blank" | "transform" | "translate";
  prompt: string;
  options: string[] | null;
};

const KIND_LABEL: Record<ClientItem["kind"], string> = {
  multiple_choice: "Choose",
  fill_blank: "Fill the blank",
  transform: "Transform",
  translate: "Translate",
};

export function ExerciseRunner({
  exerciseId,
  items,
}: {
  exerciseId: number;
  items: ClientItem[];
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grade() {
    setBusy(true);
    setError(null);
    try {
      const data = await postJSON<GradeResult>("/api/exercises/grade", { exerciseId, answers });
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const answered = Object.values(answers).filter((v) => v?.trim()).length;

  return (
    <div className="space-y-3">
      {result && <GradeFeedback result={result} />}

      {items.map((it, idx) => (
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
                    name={`q-${exerciseId}-${it.id}`}
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

      {error && <p className="text-sm text-negative">{error}</p>}

      {!result && (
        <button
          onClick={grade}
          disabled={busy || answered === 0}
          className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
        >
          {busy ? "Grading…" : `Grade exercises (${answered}/${items.length})`}
        </button>
      )}
    </div>
  );
}
