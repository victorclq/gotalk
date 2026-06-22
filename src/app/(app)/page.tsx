import Link from "next/link";
import { getAllProgress, vocabCounts, recentAttempts } from "@/lib/data";
import { LANGUAGES, SKILLS, isLang, type LangCode } from "@/lib/languages";
import { Card, PageHeader, StatCard, Badge, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

const LANG_VAR: Record<LangCode, string> = {
  es: "var(--es)",
  it: "var(--it)",
  fr: "var(--fr)",
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang: LangCode = isLang(sp.lang ?? "") ? (sp.lang as LangCode) : "es";
  const meta = LANGUAGES[lang];

  const [allProgress, counts, attempts] = await Promise.all([
    getAllProgress(),
    vocabCounts(lang),
    recentAttempts(lang, 6),
  ]);
  const progress = allProgress.find((p) => p.language === lang);

  return (
    <div>
      <PageHeader
        title={`${meta.flag} ${meta.name}`}
        subtitle={`Working from ${progress?.currentLevel ?? meta.startLevel} toward ${progress?.targetLevel ?? "C2"} fluency`}
      >
        <LinkButton href={`/grammar?lang=${lang}`}>Start a session →</LinkButton>
      </PageHeader>

      {/* All-language progress strip */}
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {allProgress.map((p) => {
          const m = LANGUAGES[p.language as LangCode];
          if (!m) return null;
          const active = p.language === lang;
          return (
            <Link
              key={p.language}
              href={`/?lang=${p.language}`}
              className={`block ${active ? "ring-2 ring-brand rounded-2xl" : ""}`}
            >
              <Card className="p-4 flex items-center gap-3 hover:bg-surface-2 transition-colors">
                <span className="text-2xl">{m.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted">{m.endonym}</div>
                </div>
                <Badge tone="brand">{p.currentLevel}</Badge>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <StatCard label="Current level" value={progress?.currentLevel ?? meta.startLevel} accent={LANG_VAR[lang]} />
        <StatCard label="XP" value={progress?.xp ?? 0} hint="earned across sessions" />
        <StatCard label="Vocab due" value={counts.due} hint={`${counts.total} cards total`} />
      </div>

      <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Practice</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {SKILLS.map((s) => (
          <Link key={s.key} href={`/${s.key}?lang=${lang}`}>
            <Card className="p-5 h-full hover:bg-surface-2 transition-colors">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="font-medium">{s.label}</div>
              <div className="text-sm text-muted mt-1">{s.description}</div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">Recent activity</h2>
      {attempts.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          No graded work yet for {meta.name}. Try a grammar or vocabulary session to get started.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {attempts.map((a) => (
            <div key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <span className="capitalize font-medium">{a.skill}</span>
                <span className="text-muted text-sm"> · {a.level}</span>
                <div className="text-xs text-muted">
                  {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
              {a.score != null && (
                <Badge tone={a.score >= 75 ? "green" : a.score >= 50 ? "amber" : "red"}>
                  {Math.round(a.score)}%
                </Badge>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
