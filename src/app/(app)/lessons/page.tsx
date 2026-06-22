import { getLevel, listLessons } from "@/lib/data";
import { LANGUAGES, isLang, type LangCode } from "@/lib/languages";
import { PageHeader } from "@/components/ui";
import { StudyClient, type SavedSession, type ClientPlan } from "@/components/StudyClient";

export const dynamic = "force-dynamic";

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang: LangCode = isLang(sp.lang ?? "") ? (sp.lang as LangCode) : "es";
  const [level, rows] = await Promise.all([getLevel(lang), listLessons(lang)]);

  const saved: SavedSession[] = rows
    .filter((l) => l.plan)
    .map((l) => ({
      id: l.id,
      title: l.title,
      topic: l.topic,
      level: l.level,
      estimatedMinutes: l.estimatedMinutes,
      createdAt: l.createdAt,
      plan: l.plan as ClientPlan,
      exerciseId: l.exerciseId,
    }));

  return (
    <div>
      <PageHeader
        title="📚 Study"
        subtitle={`${LANGUAGES[lang].name} · ${level} · guided 1–2h sessions tailored to your progress`}
      />
      <StudyClient defaultLang={lang} saved={saved} />
    </div>
  );
}
