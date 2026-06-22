import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { LANGUAGES, type LangCode, type Cefr, type Skill } from "./languages";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!_client) _client = new Anthropic();
  return _client;
}

const TUTOR_SYSTEM = `You are an expert language tutor for Spanish, Italian, and French, fluent in CEFR-based pedagogy (A1–C2). The learner is an advanced English speaker working toward full fluency. You design exercises calibrated precisely to a target CEFR level, write grammar and usage explanations that are concise but rigorous, and grade free-text answers like a strict-but-encouraging examiner: identify every error, explain the correct form, and note what was done well. Use the target language naturally; give explanations in English unless asked otherwise.`;

/**
 * Call the model and parse a JSON object validated against `schema`
 * (a JSON Schema). Uses structured outputs so the response is always valid JSON.
 */
async function generateJSON<T>(
  userPrompt: string,
  schema: Record<string, unknown>,
  maxTokens = 8000,
): Promise<T> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system: TUTOR_SYSTEM,
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: userPrompt }],
  });

  if (res.stop_reason === "refusal") {
    throw new Error("The model declined this request. Try rephrasing the topic.");
  }

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return JSON.parse(text) as T;
}

function langLabel(lang: LangCode): string {
  return LANGUAGES[lang].name;
}

// ---------- Exercise generation ----------

export type ExerciseKind = "multiple_choice" | "fill_blank" | "transform" | "translate";

export interface ExerciseItem {
  id: number;
  kind: ExerciseKind;
  prompt: string; // the question / sentence with ___ blank, or instruction
  options?: string[]; // for multiple_choice
  answer: string; // canonical correct answer (text)
  explanation: string; // why this is correct
}

export interface GeneratedExercises {
  title: string;
  items: ExerciseItem[];
}

const EXERCISE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "integer" },
          kind: {
            type: "string",
            enum: ["multiple_choice", "fill_blank", "transform", "translate"],
          },
          prompt: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["id", "kind", "prompt", "answer", "explanation"],
      },
    },
  },
  required: ["title", "items"],
};

export async function generateExercises(opts: {
  language: LangCode;
  skill: Extract<Skill, "grammar" | "vocabulary">;
  level: Cefr;
  topic?: string;
  count?: number;
}): Promise<GeneratedExercises> {
  const { language, skill, level, topic, count = 8 } = opts;
  const focus =
    skill === "grammar"
      ? "grammar (verb tenses, moods, agreement, prepositions, pronouns, syntax)"
      : "vocabulary in context (collocations, idioms, register, false friends)";
  const topicLine = topic
    ? `Focus specifically on this topic: "${topic}".`
    : `Pick a high-value ${skill} topic appropriate for ${level} and slightly stretch the learner.`;

  return generateJSON<GeneratedExercises>(
    `Create a set of ${count} ${langLabel(language)} ${focus} exercises at CEFR level ${level}.
${topicLine}
Mix the item kinds: multiple_choice (provide 3–4 options), fill_blank (use "___" for the gap), transform (give an instruction like "rewrite in the subjunctive"), and translate (a short EN↔target sentence).
For each item, give the single best canonical answer and a one- to three-sentence explanation in English. Keep prompts in ${langLabel(language)} except for translate-from-English items. Title the set after the topic.`,
    EXERCISE_SCHEMA,
  );
}

// ---------- Vocabulary generation ----------

export interface GeneratedVocab {
  term: string;
  translation: string;
  example: string;
  partOfSpeech: string;
}

const VOCAB_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          term: { type: "string" },
          translation: { type: "string" },
          example: { type: "string" },
          partOfSpeech: { type: "string" },
        },
        required: ["term", "translation", "example", "partOfSpeech"],
      },
    },
  },
  required: ["items"],
};

export async function generateVocab(opts: {
  language: LangCode;
  level: Cefr;
  theme?: string;
  count?: number;
}): Promise<GeneratedVocab[]> {
  const { language, level, theme, count = 12 } = opts;
  const themeLine = theme
    ? `Theme: "${theme}".`
    : `Choose a useful everyday or topical theme appropriate for ${level}.`;
  const out = await generateJSON<{ items: GeneratedVocab[] }>(
    `Produce ${count} ${langLabel(language)} vocabulary items at CEFR level ${level} that an advanced learner likely doesn't know yet. ${themeLine}
For each: the term (target language, with article/gender for nouns where relevant), its English translation, one natural example sentence in ${langLabel(language)}, and the part of speech.`,
    VOCAB_SCHEMA,
  );
  return out.items;
}

// ---------- Reading passage ----------

export interface GeneratedReading {
  title: string;
  passage: string;
  questions: { id: number; prompt: string; answer: string }[];
}

const READING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    passage: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "integer" },
          prompt: { type: "string" },
          answer: { type: "string" },
        },
        required: ["id", "prompt", "answer"],
      },
    },
  },
  required: ["title", "passage", "questions"],
};

export async function generateReading(opts: {
  language: LangCode;
  level: Cefr;
  topic?: string;
}): Promise<GeneratedReading> {
  const { language, level, topic } = opts;
  const topicLine = topic ? `Topic: "${topic}".` : `Pick an engaging topic for an adult reader.`;
  return generateJSON<GeneratedReading>(
    `Write a ${langLabel(language)} reading passage (180–280 words) at CEFR level ${level}. ${topicLine}
Then write 3 short comprehension questions in ${langLabel(language)}, each with a model answer. The learner will read the passage and explain in their own words what they understood; the questions help you later assess their comprehension.`,
    READING_SCHEMA,
    6000,
  );
}

// ---------- Grading ----------

export interface ItemVerdict {
  id: number;
  correct: boolean;
  yourAnswer: string;
  correctAnswer: string;
  note: string;
}

export interface GradeResult {
  score: number; // 0..100
  summary: string;
  corrections: ItemVerdict[];
  strengths: string;
  nextSteps: string;
}

const GRADE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "number" },
    summary: { type: "string" },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "integer" },
          correct: { type: "boolean" },
          yourAnswer: { type: "string" },
          correctAnswer: { type: "string" },
          note: { type: "string" },
        },
        required: ["id", "correct", "yourAnswer", "correctAnswer", "note"],
      },
    },
    strengths: { type: "string" },
    nextSteps: { type: "string" },
  },
  required: ["score", "summary", "corrections", "strengths", "nextSteps"],
};

export async function gradeExercise(opts: {
  language: LangCode;
  level: Cefr;
  items: ExerciseItem[];
  answers: Record<number, string>;
}): Promise<GradeResult> {
  const { language, level, items, answers } = opts;
  const payload = items.map((it) => ({
    id: it.id,
    kind: it.kind,
    prompt: it.prompt,
    options: it.options,
    expected: it.answer,
    learnerAnswer: answers[it.id] ?? "",
  }));

  return generateJSON<GradeResult>(
    `Grade this ${langLabel(language)} (${level}) exercise set. Accept any answer that is correct and natural, not only the listed "expected" form. For each item return: correct (boolean), the learner's answer, the best correct answer, and a short note (in English) explaining the correction or confirming why it's right. Then give an overall score 0–100, a one-paragraph summary, what the learner did well, and concrete next steps to improve.
Items and answers (JSON):
${JSON.stringify(payload, null, 2)}`,
    GRADE_SCHEMA,
  );
}

export async function gradeFreeText(opts: {
  language: LangCode;
  level: Cefr;
  skill: "writing" | "reading";
  prompt: string; // the writing prompt, or the reading passage + task
  response: string; // learner's text
}): Promise<GradeResult> {
  const { language, level, skill, prompt, response } = opts;
  const rubric =
    skill === "writing"
      ? `Assess grammar, vocabulary range, accuracy, coherence, and register against CEFR ${level}. List the most important corrections (one per "corrections" entry: quote the learner's phrase as yourAnswer, give the corrected phrase as correctAnswer, explain in note).`
      : `The learner read a passage and explained what they understood. Judge comprehension accuracy and the quality of their ${langLabel(language)} expression against CEFR ${level}. Use "corrections" for misunderstandings and language errors.`;

  return generateJSON<GradeResult>(
    `You are grading a ${langLabel(language)} ${skill} task at CEFR ${level}.
${rubric}
Return an overall score 0–100, a summary, strengths, and next steps.

TASK / PASSAGE:
${prompt}

LEARNER'S RESPONSE:
${response}`,
    GRADE_SCHEMA,
  );
}

// ---------- Writing prompt ----------

const WRITING_PROMPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    prompt: { type: "string" },
    guidance: { type: "string" },
  },
  required: ["prompt", "guidance"],
};

export async function generateWritingPrompt(opts: {
  language: LangCode;
  level: Cefr;
  topic?: string;
}): Promise<{ prompt: string; guidance: string }> {
  const { language, level, topic } = opts;
  const topicLine = topic ? `Theme: "${topic}".` : `Choose an interesting theme for an adult.`;
  return generateJSON(
    `Write a ${langLabel(language)} writing prompt for a CEFR ${level} learner. ${topicLine}
"prompt": the task in ${langLabel(language)} (e.g. write 120–180 words about X, or argue a position). "guidance": one English line on what structures/vocabulary to try to show off.`,
    WRITING_PROMPT_SCHEMA,
    1500,
  );
}

// ---------- Lessons & tips ----------

export interface GeneratedLesson {
  title: string;
  body: string; // markdown
}

const LESSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    body: { type: "string" },
  },
  required: ["title", "body"],
};

export async function generateLesson(opts: {
  language: LangCode;
  skill: Skill;
  level: Cefr;
  topic: string;
}): Promise<GeneratedLesson> {
  const { language, skill, level, topic } = opts;
  return generateJSON<GeneratedLesson>(
    `Write a focused ${langLabel(language)} ${skill} mini-lesson at CEFR ${level} on: "${topic}".
Return Markdown in "body": a short intro, the key rules or patterns with ${langLabel(language)} examples (and English glosses), common mistakes advanced learners make, and 2–3 quick self-check prompts at the end. Keep it tight and high-signal.`,
    LESSON_SCHEMA,
    5000,
  );
}
