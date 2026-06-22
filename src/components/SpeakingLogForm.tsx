"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJSON } from "@/lib/api";
import type { LangCode } from "@/lib/languages";
import { Card } from "./ui";

export function SpeakingLogForm({ lang }: { lang: LangCode }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("");
  const [score, setScore] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await postJSON("/api/speaking", {
        language: lang,
        topic: topic.trim() || undefined,
        durationMin: duration || undefined,
        score: score || undefined,
        evaluation,
      });
      setTopic("");
      setDuration("");
      setScore("");
      setEvaluation("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 space-y-3">
      <p className="text-sm text-muted">
        Have a conversation with an AI elsewhere, ask it to evaluate your speaking, then paste the
        evaluation here to track progress over time.
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic"
          className="bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
        />
        <input
          value={duration}
          onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
          placeholder="Minutes"
          inputMode="numeric"
          className="bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
        />
        <input
          value={score}
          onChange={(e) => setScore(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Score 0–100 (optional)"
          inputMode="numeric"
          className="bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
        />
      </div>
      <textarea
        value={evaluation}
        onChange={(e) => setEvaluation(e.target.value)}
        rows={6}
        placeholder="Paste the AI's evaluation of your speaking here…"
        className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-brand"
      />
      {error && <p className="text-sm text-negative">{error}</p>}
      <button
        onClick={save}
        disabled={busy || !evaluation.trim()}
        className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
      >
        {busy ? "Saving…" : "Save log"}
      </button>
    </Card>
  );
}
