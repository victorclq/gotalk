"use client";

import { useState } from "react";
import { postJSON } from "@/lib/api";
import type { LangCode } from "@/lib/languages";
import { Card, Badge, EmptyState } from "./ui";

export type Flashcard = {
  id: number;
  term: string;
  translation: string;
  example: string | null;
  partOfSpeech: string | null;
};

const GRADES = [
  { key: "again", label: "Again", tone: "bg-negative/20 text-negative" },
  { key: "hard", label: "Hard", tone: "bg-accent/20 text-accent" },
  { key: "good", label: "Good", tone: "bg-brand/20 text-brand" },
  { key: "easy", label: "Easy", tone: "bg-positive/20 text-positive" },
] as const;

export function VocabTrainer({
  lang,
  initialDue,
  totalCount,
}: {
  lang: LangCode;
  initialDue: Flashcard[];
  totalCount: number;
}) {
  const [queue, setQueue] = useState<Flashcard[]>(initialDue);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);

  const card = queue[idx];

  async function gradeCard(grade: string) {
    if (!card) return;
    setBusy(true);
    try {
      await postJSON("/api/vocab/review", { id: card.id, grade });
      setReviewed((n) => n + 1);
      setFlipped(false);
      setIdx((i) => i + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setAdded(null);
    try {
      const data = await postJSON<{ added: number; items: Flashcard[] }>(
        "/api/vocab/generate",
        { language: lang, theme: theme.trim() || undefined },
      );
      setAdded(data.added);
      // New cards are due immediately — append to the queue.
      setQueue((q) => [...q.slice(idx), ...data.items]);
      setIdx(0);
      setFlipped(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const doneReviewing = !card;

  return (
    <div className="space-y-6">
      {error && <Card className="p-4 text-sm text-negative border-negative/40">{error}</Card>}

      {!doneReviewing ? (
        <>
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              Card {idx + 1} of {queue.length} due
            </span>
            <span>{reviewed} reviewed today</span>
          </div>

          <Card
            className="p-10 text-center cursor-pointer select-none min-h-[220px] flex flex-col items-center justify-center"
            onClick={() => setFlipped((f) => !f)}
          >
            {card.partOfSpeech && (
              <div className="mb-3">
                <Badge>{card.partOfSpeech}</Badge>
              </div>
            )}
            <div className="text-3xl font-semibold">{card.term}</div>
            {flipped ? (
              <div className="mt-4 space-y-2">
                <div className="text-xl text-brand">{card.translation}</div>
                {card.example && <p className="text-sm text-muted italic">“{card.example}”</p>}
              </div>
            ) : (
              <p className="text-xs text-muted mt-4">Tap to reveal</p>
            )}
          </Card>

          {flipped && (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.key}
                  onClick={() => gradeCard(g.key)}
                  disabled={busy}
                  className={`py-3 rounded-xl text-sm font-medium disabled:opacity-50 ${g.tone}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="🎉"
          title={reviewed > 0 ? "All caught up!" : "No cards due right now"}
          description={
            totalCount === 0
              ? "Generate your first vocabulary set below to start building your deck."
              : `You have ${totalCount} cards total. Generate more below, or come back when cards are due.`
          }
        />
      )}

      <Card className="p-5">
        <label className="text-sm text-muted">Generate new vocabulary</label>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Theme (optional): cooking, business, travel…"
            className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
          />
          <button
            onClick={generate}
            disabled={busy}
            className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            {busy ? "Generating…" : "Generate 12 cards"}
          </button>
        </div>
        {added != null && (
          <p className="text-sm text-positive mt-2">Added {added} new cards to your deck.</p>
        )}
      </Card>
    </div>
  );
}
