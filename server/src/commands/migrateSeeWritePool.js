import "dotenv/config";
import mongoose from "mongoose";
import { CONNECT_DB } from "@server/config/mongodb";
import { SeeWrite } from "@server/models/writing/SeeWrite";
import { Vocabulary } from "@server/models/vocabulary/Vocabulary";
import { ensureEnriched } from "@server/services/vocabularyService";

/**
 * Migrate legacy SeeWrite docs to the new schema:
 *   - mediaUrl → image
 *   - requiredWords (top-level [string]) + wordPool (legacy [string] OR [object])
 *     → wordPool [{ id: Vocabulary._id, isRequired }]
 *   - drop legacy fields: requiredWords, totalSentences (top-level), distractorWords, mediaUrl
 *
 * Idempotent: docs already in new shape (wordPool[0].id present) are skipped.
 *
 * Usage:
 *   DRY_RUN=1 pnpm dlx @babel/node src/commands/migrateSeeWritePool.js
 *   pnpm dlx @babel/node src/commands/migrateSeeWritePool.js
 */

const DRY_RUN = process.env.DRY_RUN === "1";

function normalize(w) {
  return String(w || "").trim().toLowerCase();
}

function extractWordString(item) {
  if (typeof item === "string") return normalize(item);
  if (item && typeof item === "object" && item.word) return normalize(item.word);
  return null;
}

async function upsertVocab(word) {
  const vocab = await Vocabulary.findOneAndUpdate(
    { word },
    { $setOnInsert: { word, definitions: [] } },
    { upsert: true, new: true },
  );
  if (!vocab.definitions || vocab.definitions.length === 0) {
    ensureEnriched(vocab).catch((err) =>
      console.warn(`  [enrich] "${word}" failed: ${err.message}`),
    );
  }
  return vocab._id;
}

async function migrateDoc(doc) {
  // Skip if already migrated (first wordPool entry has an .id ObjectId)
  const first = doc.wordPool?.[0];
  if (first && first.id && mongoose.isValidObjectId(first.id)) {
    return { skipped: true, reason: "already migrated" };
  }

  // Resolve required & distractor sets from legacy fields
  const legacyRequired = Array.isArray(doc.requiredWords)
    ? doc.requiredWords.map(normalize).filter(Boolean)
    : [];
  const legacyPool = Array.isArray(doc.wordPool)
    ? doc.wordPool.map(extractWordString).filter(Boolean)
    : [];
  const legacyDistractor = Array.isArray(doc.distractorWords)
    ? doc.distractorWords.map(normalize).filter(Boolean)
    : [];

  const requiredSet = new Set(legacyRequired);
  // Distractor = (legacy pool ∪ legacy distractorWords) − required
  const distractorSet = new Set([...legacyPool, ...legacyDistractor]);
  for (const w of requiredSet) distractorSet.delete(w);

  const entries = [
    ...[...requiredSet].map((word) => ({ word, isRequired: true })),
    ...[...distractorSet].map((word) => ({ word, isRequired: false })),
  ];

  // Resolve image: mediaUrl → image (don't overwrite if already correct)
  const image = doc.image || doc.mediaUrl || null;
  if (!image) {
    return { skipped: true, reason: "no image/mediaUrl" };
  }

  // Resolve all vocabs (sequential to avoid hammering DB on big collections)
  const resolved = [];
  for (const { word, isRequired } of entries) {
    const id = DRY_RUN ? "DRY_RUN_ID" : await upsertVocab(word);
    resolved.push({ id, isRequired });
  }

  if (DRY_RUN) {
    return {
      skipped: false,
      preview: {
        _id: doc._id,
        image,
        wordPoolSize: resolved.length,
        required: [...requiredSet],
        distractor: [...distractorSet],
      },
    };
  }

  await SeeWrite.collection.updateOne(
    { _id: doc._id },
    {
      $set: { image, wordPool: resolved },
      $unset: {
        mediaUrl: "",
        requiredWords: "",
        distractorWords: "",
        totalSentences: "",
      },
    },
  );

  return {
    skipped: false,
    migrated: {
      _id: doc._id,
      required: requiredSet.size,
      distractor: distractorSet.size,
    },
  };
}

async function run() {
  await CONNECT_DB();
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);

  const docs = await SeeWrite.collection.find({}).toArray();
  console.log(`Found ${docs.length} SeeWrite docs.\n`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const result = await migrateDoc(doc);
    if (result.skipped) {
      skipped++;
      console.log(`SKIP  ${doc._id} — ${result.reason}`);
    } else {
      migrated++;
      console.log(
        `${DRY_RUN ? "PLAN " : "DONE "} ${doc._id} —`,
        result.preview || result.migrated,
      );
    }
  }

  console.log(`\nSummary: migrated=${migrated}, skipped=${skipped}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
