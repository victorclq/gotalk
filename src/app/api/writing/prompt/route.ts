import { NextRequest, NextResponse } from "next/server";
import { generateWritingPrompt } from "@/lib/ai";
import { getLevel } from "@/lib/data";
import { isLang, type Cefr } from "@/lib/languages";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, topic } = body ?? {};
    if (!isLang(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    const level: Cefr = body.level ?? (await getLevel(language));
    const out = await generateWritingPrompt({ language, level, topic });
    return NextResponse.json({ ...out, level });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
