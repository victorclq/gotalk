import { getLevel, dueVocab, vocabCounts } from "@/lib/data";
import { LANGUAGES, isLang, type LangCode } from "@/lib/languages";
import { PageHeader } from "@/components/ui";
import { VocabTrainer, type Flashcard } from "@/components/VocabTrainer";

export const dynamic = "force-dynamic";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang: LangCode = isLang(sp.lang ?? "") ? (sp.lang as LangCode) : "es";
  const [level, due, counts] = await Promise.all([
    getLevel(lang),
    dueVocab(lang, 40),
    vocabCounts(lang),
  ]);

  const cards: Flashcard[] = due.map((c) => ({
    id: c.id,
    term: c.term,
    translation: c.translation,
    example: c.example,
    partOfSpeech: c.partOfSpeech,
  }));

  return (
    <div>
      <PageHeader
        title="🗂️ Vocabulary"
        subtitle={`${LANGUAGES[lang].name} · ${level} · spaced-repetition flashcards`}
      />
      <VocabTrainer lang={lang} initialDue={cards} totalCount={counts.total} />
    </div>
  );
}
