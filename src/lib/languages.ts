export type LangCode = "es" | "it" | "fr";
export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type Skill = "grammar" | "vocabulary" | "reading" | "writing" | "speaking";

export const CEFR_LEVELS: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export interface LangMeta {
  code: LangCode;
  name: string; // English name
  endonym: string; // native name
  flag: string;
  startLevel: Cefr; // Victor's starting point
}

export const LANGUAGES: Record<LangCode, LangMeta> = {
  es: { code: "es", name: "Spanish", endonym: "Español", flag: "🇪🇸", startLevel: "B1" },
  it: { code: "it", name: "Italian", endonym: "Italiano", flag: "🇮🇹", startLevel: "B2" },
  fr: { code: "fr", name: "French", endonym: "Français", flag: "🇫🇷", startLevel: "C1" },
};

export const LANG_LIST = Object.values(LANGUAGES);

export const SKILLS: { key: Skill; label: string; icon: string; description: string }[] = [
  { key: "grammar", label: "Grammar", icon: "📐", description: "Targeted drills with instant correction" },
  { key: "vocabulary", label: "Vocabulary", icon: "🗂️", description: "Spaced-repetition flashcards" },
  { key: "reading", label: "Reading", icon: "📖", description: "Read a passage, explain what you understood" },
  { key: "writing", label: "Writing", icon: "✍️", description: "Write to a prompt, get graded corrections" },
  { key: "speaking", label: "Speaking", icon: "🎙️", description: "Log AI conversation evaluations" },
];

export function isLang(x: string): x is LangCode {
  return x === "es" || x === "it" || x === "fr";
}

export function langName(code: string): string {
  return isLang(code) ? LANGUAGES[code].name : code;
}

export function nextLevel(level: Cefr): Cefr {
  const i = CEFR_LEVELS.indexOf(level);
  return CEFR_LEVELS[Math.min(i + 1, CEFR_LEVELS.length - 1)];
}
