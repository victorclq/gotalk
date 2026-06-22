import { getLevel, listLessons } from "@/lib/data";
import { LANGUAGES, isLang, type LangCode } from "@/lib/languages";
import { PageHeader } from "@/components/ui";
import { LessonsClient, type LessonRow } from "@/components/LessonsClient";

export const dynamic = "force-dynamic";

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang: LangCode = isLang(sp.lang ?? "") ? (sp.lang as LangCode) : "es";
  const [level, rows] = await Promise.all([getLevel(lang), listLessons(lang)]);

  const lessons: LessonRow[] = rows.map((l) => ({
    id: l.id,
    skill: l.skill,
    level: l.level,
    topic: l.topic,
    title: l.title,
    body: l.body,
    createdAt: l.createdAt,
  }));

  return (
    <div>
      <PageHeader
        title="📚 Lessons & tips"
        subtitle={`${LANGUAGES[lang].name} · ${level} · AI mini-lessons on any topic`}
      />
      <LessonsClient lang={lang} level={level} lessons={lessons} />
    </div>
  );
}
