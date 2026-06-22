import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { LANGUAGES, type LangCode, type Cefr, type Skill } from "./languages";
import type { LearnerProfile } from "./data";

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

// ---------- Study sessions (1–2h guided lessons) ----------

export interface StudySection {
  title: string;
  minutes: number;
  type: "explanation" | "practice";
  content: string; // markdown
}

export interface VideoSuggestion {
  channel: string; // a real, well-known YouTube channel for this language
  searchQuery: string; // a specific search to run on that channel/topic
  why: string; // what to focus on while watching
}

export interface StudySession {
  title: string;
  focus: string;
  focusRationale: string; // why this focus, grounded in the learner's history
  primarySkill: Skill;
  estimatedMinutes: number;
  objectives: string[];
  sections: StudySection[];
  exercises: ExerciseItem[];
  videos: VideoSuggestion[];
  selfCheck: string[];
  nextFocus: string;
}

const STUDY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    focus: { type: "string" },
    focusRationale: { type: "string" },
    primarySkill: {
      type: "string",
      enum: ["grammar", "vocabulary", "reading", "writing", "speaking"],
    },
    estimatedMinutes: { type: "integer" },
    objectives: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          minutes: { type: "integer" },
          type: { type: "string", enum: ["explanation", "practice"] },
          content: { type: "string" },
        },
        required: ["title", "minutes", "type", "content"],
      },
    },
    exercises: {
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
    videos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          channel: { type: "string" },
          searchQuery: { type: "string" },
          why: { type: "string" },
        },
        required: ["channel", "searchQuery", "why"],
      },
    },
    selfCheck: { type: "array", items: { type: "string" } },
    nextFocus: { type: "string" },
  },
  required: [
    "title",
    "focus",
    "focusRationale",
    "primarySkill",
    "estimatedMinutes",
    "objectives",
    "sections",
    "exercises",
    "videos",
    "selfCheck",
    "nextFocus",
  ],
};

function profileSummary(p: LearnerProfile): string {
  const skills = p.skillScores.length
    ? p.skillScores.map((s) => `${s.skill} avg ${s.avgScore}% over ${s.attempts}`).join("; ")
    : "no graded work yet";
  return JSON.stringify(
    {
      currentLevel: p.level,
      targetLevel: p.targetLevel,
      skillPerformance: skills,
      recurringMistakes: p.weakCorrections,
      priorNextStepsGiven: p.recentNextSteps,
      vocab: p.vocab,
      sessionsAlreadyStudied: p.recentTopics,
      speakingPracticeCount: p.speakingLogs,
    },
    null,
    2,
  );
}

export async function generateStudySession(opts: {
  profile: LearnerProfile;
  focus?: string;
}): Promise<StudySession> {
  const { profile, focus } = opts;
  const language = profile.language;
  const focusLine = focus
    ? `The learner asked to focus on: "${focus}". Build the session around that.`
    : `No topic was given — YOU choose the highest-value focus for this learner based on their history below (target their weakest skills and recurring mistakes; avoid topics already covered unless they're still weak). Explain the choice in focusRationale.`;

  return generateJSON<StudySession>(
    `Design a complete ${langLabel(language)} self-study session of about 60–120 minutes for an advanced learner at CEFR ${profile.level}, working toward ${profile.targetLevel}.
${focusLine}

LEARNER PROFILE (everything the app knows from their past work — use it to personalise):
${profileSummary(profile)}

Produce a structured session:
- objectives: concrete "by the end you can…" outcomes.
- sections: timed blocks (sum roughly to estimatedMinutes). Use type "explanation" for teaching (Markdown, with ${langLabel(language)} examples + English glosses) and type "practice" for active tasks the learner does themselves (shadowing, writing, etc.).
- exercises: 6–10 gradeable items (mix of multiple_choice with 3–4 options, fill_blank using "___", transform, translate) at level ${profile.level}, each with the canonical answer and a short English explanation. Target the learner's weak spots.
- videos: 2–3 suggestions for NATIVE, real-life speaking. Use REAL, well-known ${langLabel(language)} YouTube channels (e.g. comprehensible-input / street-interview / podcast channels). Give the channel name, a specific search query to find relevant content, and what to focus on. Do NOT invent specific video URLs.
- selfCheck: a few questions the learner answers to confirm they met the objectives.
- nextFocus: what they should study next after this.`,
    STUDY_SCHEMA,
    12000,
  );
}

// ---------- Study guidance (roadmap to fluency) ----------

export interface StudyGuidance {
  summary: string;
  focusAreas: { area: string; why: string }[];
  milestones: { level: string; target: string }[];
  weeklyPlan: string;
}

const GUIDANCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    focusAreas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { area: { type: "string" }, why: { type: "string" } },
        required: ["area", "why"],
      },
    },
    milestones: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { level: { type: "string" }, target: { type: "string" } },
        required: ["level", "target"],
      },
    },
    weeklyPlan: { type: "string" },
  },
  required: ["summary", "focusAreas", "milestones", "weeklyPlan"],
};

export async function generateStudyGuidance(profile: LearnerProfile): Promise<StudyGuidance> {
  const language = profile.language;
  return generateJSON<StudyGuidance>(
    `Act as a ${langLabel(language)} study coach. The learner is at CEFR ${profile.level} aiming for ${profile.targetLevel} (full fluency). Based on their history, lay out a personalised roadmap.

LEARNER PROFILE:
${profileSummary(profile)}

Return:
- summary: 2–3 sentences on where they are and what will move the needle most.
- focusAreas: 3–5 specific things to prioritise now (area + why), grounded in their weak spots.
- milestones: the remaining CEFR steps up to ${profile.targetLevel}, each with what mastering it looks like.
- weeklyPlan: a realistic weekly study rhythm across grammar, vocab, reading, writing, speaking, and native-input video.`,
    GUIDANCE_SCHEMA,
    5000,
  );
}
