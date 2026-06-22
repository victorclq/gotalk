"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJSON } from "@/lib/api";
import { SKILLS, type LangCode, type Cefr, type Skill } from "@/lib/languages";
import { Card, Badge, EmptyState } from "./ui";

export type LessonRow = {
  id: number;
  skill: string;
  level: string;
  topic: string;
  title: string;
  body: string;
  createdAt: string | Date;
};

export function LessonsClient({
  lang,
  level,
  lessons,
}: {
  lang: LangCode;
  level: Cefr;
  lessons: LessonRow[];
}) {
  const router = useRouter();
  const [skill, setSkill] = useState<Skill>("grammar");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<LessonRow | null>(null);

  async function generate() {
    if (!topic.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const row = await postJSON<LessonRow>("/api/lessons/generate", {
        language: lang,
        skill,
        topic: topic.trim(),
      });
      setOpen(row);
      setTopic("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-3">
        <label className="text-sm text-muted">Ask for a mini-lesson on any topic</label>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSkill(s.key)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                skill === s.key ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={`e.g. when to use the ${lang === "fr" ? "passé composé vs imparfait" : "subjunctive"}`}
            className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
          />
          <button
            onClick={generate}
            disabled={busy || !topic.trim()}
            className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            {busy ? "Writing…" : `Generate ${level} lesson`}
          </button>
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
      </Card>

      {open && (
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-medium">{open.title}</h2>
              <div className="flex gap-2 mt-1">
                <Badge tone="brand">{open.skill}</Badge>
                <Badge>{open.level}</Badge>
              </div>
            </div>
            <button onClick={() => setOpen(null)} className="text-muted hover:text-foreground text-sm">
              Close
            </button>
          </div>
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{open.body}</div>
        </Card>
      )}

      <h2 className="text-sm font-medium text-muted uppercase tracking-wide">Saved lessons</h2>
      {lessons.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No lessons yet"
          description="Generate a mini-lesson above — they're saved here so you can re-read them anytime."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {lessons.map((l) => (
            <button key={l.id} onClick={() => setOpen(l)} className="text-left">
              <Card className="p-4 h-full hover:bg-surface-2 transition-colors">
                <div className="font-medium">{l.title}</div>
                <div className="flex gap-2 mt-2">
                  <Badge tone="brand">{l.skill}</Badge>
                  <Badge>{l.level}</Badge>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
