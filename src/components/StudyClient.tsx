"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJSON } from "@/lib/api";
import type { StudySession, StudyGuidance } from "@/lib/ai";
import { LANG_LIST, LANGUAGES, type LangCode } from "@/lib/languages";
import { Card, Badge, EmptyState } from "./ui";
import { ExerciseRunner, type ClientItem } from "./ExerciseRunner";

// Plan as stored/returned to the client (exercise answers stripped out).
export type ClientPlan = Omit<StudySession, "exercises"> & { exercises: ClientItem[] };

export type SavedSession = {
  id: number;
  title: string;
  topic: string;
  level: string;
  estimatedMinutes: number | null;
  createdAt: string | Date;
  plan: ClientPlan | null;
  exerciseId: number | null;
};

type Guidance = StudyGuidance & { level: string; targetLevel: string };
type SessionResp = { id: number; level: string; exerciseId: number | null; plan: ClientPlan };

function ytSearch(channel: string, query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${channel} ${query}`)}`;
}

function SectionBlock({ s }: { s: ClientPlan["sections"][number] }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-medium">{s.title}</div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={s.type === "practice" ? "amber" : "brand"}>
            {s.type === "practice" ? "Practice" : "Learn"}
          </Badge>
          <span className="text-xs text-muted">~{s.minutes} min</span>
        </div>
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{s.content}</div>
    </Card>
  );
}

function SessionView({
  plan,
  exerciseId,
}: {
  plan: ClientPlan;
  exerciseId: number | null;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge tone="brand">{plan.primarySkill}</Badge>
          <Badge>~{plan.estimatedMinutes} min</Badge>
        </div>
        <h2 className="text-xl font-semibold">{plan.title}</h2>
        <p className="text-sm text-muted mt-2">
          <span className="text-accent font-medium">Why this focus:</span> {plan.focusRationale}
        </p>
        {plan.objectives?.length > 0 && (
          <ul className="mt-3 space-y-1">
            {plan.objectives.map((o, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-positive">✓</span>
                {o}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {plan.sections?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted uppercase tracking-wide">Study plan</h3>
          {plan.sections.map((s, i) => (
            <SectionBlock key={i} s={s} />
          ))}
        </div>
      )}

      {plan.videos?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted uppercase tracking-wide">
            🎥 Native speech — watch & listen
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {plan.videos.map((v, i) => (
              <a key={i} href={ytSearch(v.channel, v.searchQuery)} target="_blank" rel="noreferrer">
                <Card className="p-4 h-full hover:bg-surface-2 transition-colors">
                  <div className="font-medium flex items-center gap-2">
                    <span>▶️</span>
                    {v.channel}
                  </div>
                  <div className="text-xs text-brand mt-1">“{v.searchQuery}” ↗</div>
                  <p className="text-sm text-muted mt-1">{v.why}</p>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}

      {exerciseId && plan.exercises?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted uppercase tracking-wide">Exercises</h3>
          <ExerciseRunner exerciseId={exerciseId} items={plan.exercises} />
        </div>
      )}

      {plan.selfCheck?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-medium mb-2">Self-check</h3>
          <ul className="space-y-1">
            {plan.selfCheck.map((q, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-muted">{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {plan.nextFocus && (
        <Card className="p-4">
          <span className="text-accent font-medium text-sm">Next up: </span>
          <span className="text-sm">{plan.nextFocus}</span>
        </Card>
      )}
    </div>
  );
}

export function StudyClient({
  defaultLang,
  saved,
}: {
  defaultLang: LangCode;
  saved: SavedSession[];
}) {
  const router = useRouter();
  const [lang, setLang] = useState<LangCode>(defaultLang);
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState<"session" | "guidance" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionResp | null>(null);
  const [guidance, setGuidance] = useState<Guidance | null>(null);

  const meta = LANGUAGES[lang];
  // Saved sessions for the currently-selected language.
  const savedForLang = saved.filter((s) => s.plan && s.id);

  async function startSession() {
    setBusy("session");
    setError(null);
    setSession(null);
    try {
      const data = await postJSON<SessionResp>("/api/study/session", {
        language: lang,
        focus: focus.trim() || undefined,
      });
      setSession(data);
      setFocus("");
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function getGuidance() {
    setBusy("guidance");
    setError(null);
    try {
      const data = await postJSON<Guidance>("/api/study/guidance", { language: lang });
      setGuidance(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Start a new session */}
      <Card className="p-5 space-y-4">
        <div>
          <label className="text-sm text-muted">Which language do you want to study?</label>
          <div className="flex gap-2 mt-2">
            {LANG_LIST.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setSession(null);
                  setGuidance(null);
                  router.push(`/lessons?lang=${l.code}`);
                }}
                className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${
                  lang === l.code
                    ? "bg-brand text-white"
                    : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                <span>{l.flag}</span>
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-muted">
            Focus (optional — leave blank and the app picks based on your history)
          </label>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder={`e.g. subjunctive, connectors, business ${meta.name}…`}
              className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
            />
            <button
              onClick={startSession}
              disabled={busy !== null}
              className="bg-brand hover:bg-brand-strong disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-medium whitespace-nowrap"
            >
              {busy === "session" ? "Building your session…" : "Generate 1–2h session"}
            </button>
          </div>
          <p className="text-xs text-muted mt-2">
            Builds a personalised {meta.name} study session from your past exercises, scores, and
            mistakes — with explanations, graded practice, and native-speech videos.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={getGuidance}
            disabled={busy !== null}
            className="bg-surface-2 hover:bg-border disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium"
          >
            {busy === "guidance" ? "Thinking…" : "🧭 What should I study next?"}
          </button>
          <span className="text-xs text-muted">Get a roadmap to fluency for {meta.name}.</span>
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}
      </Card>

      {/* Guidance / roadmap */}
      {guidance && (
        <Card className="p-5 space-y-4 border-brand/40">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">🧭 Your roadmap — {meta.name}</h2>
            <Badge tone="brand">
              {guidance.level} → {guidance.targetLevel}
            </Badge>
          </div>
          <p className="text-sm">{guidance.summary}</p>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted mb-2">Focus now</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {guidance.focusAreas.map((f, i) => (
                <div key={i} className="bg-surface-2 rounded-lg p-3">
                  <div className="text-sm font-medium">{f.area}</div>
                  <div className="text-xs text-muted mt-0.5">{f.why}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted mb-2">Milestones</div>
            <div className="space-y-2">
              {guidance.milestones.map((m, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <Badge>{m.level}</Badge>
                  <span className="text-muted">{m.target}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted mb-1">Weekly rhythm</div>
            <p className="text-sm whitespace-pre-wrap">{guidance.weeklyPlan}</p>
          </div>
        </Card>
      )}

      {/* Freshly generated session */}
      {session && <SessionView plan={session.plan} exerciseId={session.exerciseId} />}

      {/* Saved sessions */}
      {!session && (
        <>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide">Past sessions</h2>
          {savedForLang.length === 0 ? (
            <EmptyState
              icon="📚"
              title="No study sessions yet"
              description="Generate your first 1–2 hour session above — it's tailored to what you've practised so far and saved here to revisit."
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {savedForLang.map((s) => (
                <button key={s.id} onClick={() => setSession({ id: s.id, level: s.level, exerciseId: s.exerciseId, plan: s.plan! })} className="text-left">
                  <Card className="p-4 h-full hover:bg-surface-2 transition-colors">
                    <div className="font-medium">{s.title}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge tone="brand">{s.topic}</Badge>
                      <Badge>{s.level}</Badge>
                      {s.estimatedMinutes && <Badge>~{s.estimatedMinutes} min</Badge>}
                    </div>
                    <div className="text-xs text-muted mt-2">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
