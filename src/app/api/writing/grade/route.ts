import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attempts } from "@/db/schema";
import { gradeFreeText } from "@/lib/ai";
import { getLevel, touchStudied } from "@/lib/data";
import { isLang, type Cefr } from "@/lib/languages";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, prompt, response } = body ?? {};
    if (!isLang(language) || !prompt?.trim() || !response?.trim()) {
      return NextResponse.json({ error: "Missing language, prompt, or response" }, { status: 400 });
    }
    const level: Cefr = body.level ?? (await getLevel(language));

    const result = await gradeFreeText({
      language,
      level,
      skill: "writing",
      prompt,
      response,
    });

    await db.insert(attempts).values({
      language,
      skill: "writing",
      level,
      answers: { prompt, response },
      score: result.score,
      feedback: result,
    });
    await touchStudied(language, Math.round(result.score / 10));

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
