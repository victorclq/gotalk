import { getLevel } from "@/lib/data";
import { LANGUAGES, isLang, type LangCode } from "@/lib/languages";
import { PageHeader } from "@/components/ui";
import { GrammarSession } from "@/components/GrammarSession";

export const dynamic = "force-dynamic";

export default async function GrammarPage({
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
        title="📐 Grammar"
        subtitle={`${LANGUAGES[lang].name} · ${level} · AI-generated drills with instant correction`}
      />
      <GrammarSession lang={lang} level={level} />
    </div>
  );
}
