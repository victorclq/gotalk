import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vocab } from "@/db/schema";
import { generateVocab } from "@/lib/ai";
import { getLevel } from "@/lib/data";
import { isLang, type Cefr } from "@/lib/languages";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, theme, count } = body ?? {};
    if (!isLang(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    const level: Cefr = body.level ?? (await getLevel(language));

    const items = await generateVocab({ language, level, theme, count });

    const inserted = await db
      .insert(vocab)
      .values(
        items.map((it) => ({
          language,
          level,
          term: it.term,
          translation: it.translation,
          example: it.example,
          partOfSpeech: it.partOfSpeech,
        })),
      )
      .returning();

    return NextResponse.json({ added: inserted.length, items: inserted });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
