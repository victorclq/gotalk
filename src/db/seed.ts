import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index";
import { languageProgress } from "./schema";
import { LANG_LIST } from "../lib/languages";

async function main() {
  console.log("Seeding language_progress…");
  for (const lang of LANG_LIST) {
    await db
      .insert(languageProgress)
      .values({
        language: lang.code,
        currentLevel: lang.startLevel,
        targetLevel: "C2",
      })
      .onConflictDoNothing({ target: languageProgress.language });
    console.log(`  ${lang.flag} ${lang.name} → ${lang.startLevel} (target C2)`);
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
