import { getLevel } from "@/lib/data";
import { LANGUAGES, isLang, type LangCode } from "@/lib/languages";
import { PageHeader } from "@/components/ui";
import { ReadingSession } from "@/components/ReadingSession";

export const dynamic = "force-dynamic";

export default async function ReadingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang: LangCode = isLang(sp.lang ?? "") ? (sp.lang as LangCode) : "es";
  const level = await getLevel(lang);

  return (
    <div>
      <PageHeader
        title="📖 Reading"
        subtitle={`${LANGUAGES[lang].name} · ${level} · read, then explain what you understood`}
      />
      <ReadingSession lang={lang} level={level} />
    </div>
  );
}
