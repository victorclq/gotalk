import { getLevel } from "@/lib/data";
import { LANGUAGES, isLang, type LangCode } from "@/lib/languages";
import { PageHeader } from "@/components/ui";
import { WritingSession } from "@/components/WritingSession";

export const dynamic = "force-dynamic";

export default async function WritingPage({
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
        title="✍️ Writing"
        subtitle={`${LANGUAGES[lang].name} · ${level} · write to a prompt, get graded corrections`}
      />
      <WritingSession lang={lang} level={level} />
    </div>
  );
}
