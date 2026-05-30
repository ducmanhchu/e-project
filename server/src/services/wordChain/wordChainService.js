import mongoose from "mongoose";
import { WordChainGame } from "@server/models/wordChain/WordChainGame";
import { ApiError } from "@server/helpers/ApiError";
import {
  WORD_CHAIN_LEVEL,
  WORD_CHAIN_STATUS,
  WORD_CHAIN_SPEAKER,
  WORD_CHAIN_FAIL_REASON,
  TIME_LIMIT_PER_LEVEL_MS,
  MIN_WORD_LENGTH,
} from "@server/const/wordChain";
import * as botPicker from "@server/services/wordChain/botPicker";
import { isValidEnglishWord } from "@server/services/wordChain/wordlistLoader";

const MAX_SAVE_RETRIES = 3;

function validateLevel(level) {
  if (!Object.values(WORD_CHAIN_LEVEL).includes(level)) {
    throw ApiError.badRequest("Invalid level");
  }
}

const countUserWords = (words) =>
  words.filter((w) => w.by === WORD_CHAIN_SPEAKER.USER).length;
const getUsedSet = (words) => new Set(words.map((w) => w.word.toLowerCase()));
const lastWord = (words) => words[words.length - 1];

function toResponse(game) {
  const timeLimit = TIME_LIMIT_PER_LEVEL_MS[game.level];
  const isActive = game.status === WORD_CHAIN_STATUS.ACTIVE;
  const last = game.words[game.words.length - 1];
  return {
    id: String(game._id),
    level: game.level,
    status: game.status,
    words: game.words,
    nextLetter: isActive ? last.word.slice(-1) : null,
    currentScore: countUserWords(game.words),
    finalScore: game.finalScore,
    failReason: game.failReason,
    didWin: game.failReason === WORD_CHAIN_FAIL_REASON.BOT_CANT_CONTINUE,
    turnStartedAt: game.turnStartedAt,
    timeLimitMs: timeLimit,
    deadlineAt: isActive
      ? new Date(game.turnStartedAt.getTime() + timeLimit)
      : null,
    endedAt: game.endedAt,
    createdAt: game.createdAt,
  };
}

async function withVersionRetry(fn) {
  for (let attempt = 0; attempt < MAX_SAVE_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isVersionConflict = err?.name === "VersionError";
      if (!isVersionConflict || attempt === MAX_SAVE_RETRIES - 1) throw err;
    }
  }
}

export async function startGame({ userId, level }) {
  validateLevel(level);

  for (let attempt = 0; attempt < MAX_SAVE_RETRIES; attempt++) {
    await WordChainGame.updateMany(
      { userId, status: WORD_CHAIN_STATUS.ACTIVE },
      {
        $set: {
          status: WORD_CHAIN_STATUS.ENDED,
          failReason: WORD_CHAIN_FAIL_REASON.ABANDONED,
          endedAt: new Date(),
        },
      },
    );

    const seed = await botPicker.pickSeedWord({ level });
    const now = new Date();

    try {
      const game = await WordChainGame.create({
        userId,
        level,
        status: WORD_CHAIN_STATUS.ACTIVE,
        words: [
          {
            word: seed.word,
            by: WORD_CHAIN_SPEAKER.BOT,
            source: seed.source,
            at: now,
          },
        ],
        turnStartedAt: now,
      });
      return toResponse(game);
    } catch (err) {
      const isDuplicateKey = err?.code === 11000;
      if (!isDuplicateKey || attempt === MAX_SAVE_RETRIES - 1) throw err;
    }
  }
}

export async function submitWord({ userId, gameId, word }) {
  if (typeof word !== "string" || !word.trim()) {
    throw ApiError.badRequest("word is required");
  }
  const trimmed = word.trim().toLowerCase();
  return withVersionRetry(() => submitOnce({ userId, gameId, word: trimmed }));
}

async function submitOnce({ userId, gameId, word }) {
  const game = await WordChainGame.findOne({ _id: gameId, userId });
  if (!game) throw ApiError.notFound("Game not found");
  if (game.status !== WORD_CHAIN_STATUS.ACTIVE) {
    throw ApiError.badRequest("Game already ended");
  }

  const now = new Date();
  const timeLimit = TIME_LIMIT_PER_LEVEL_MS[game.level];
  const requiredLetter = lastWord(game.words).word.slice(-1);
  const usedSet = getUsedSet(game.words);

  // Validation order: time → format → letter → duplicate → dictionary
  if (now - game.turnStartedAt > timeLimit) {
    return endGame(game, WORD_CHAIN_FAIL_REASON.TIMEOUT, now);
  }
  if (word.length < MIN_WORD_LENGTH) {
    return endGame(game, WORD_CHAIN_FAIL_REASON.TOO_SHORT, now);
  }
  if (!/^[a-z]+$/.test(word)) {
    return endGame(game, WORD_CHAIN_FAIL_REASON.NOT_IN_DICTIONARY, now);
  }
  if (word[0] !== requiredLetter) {
    return endGame(game, WORD_CHAIN_FAIL_REASON.WRONG_LETTER, now);
  }
  if (usedSet.has(word)) {
    return endGame(game, WORD_CHAIN_FAIL_REASON.DUPLICATE, now);
  }
  if (!isValidEnglishWord(word)) {
    return endGame(game, WORD_CHAIN_FAIL_REASON.NOT_IN_DICTIONARY, now);
  }

  game.words.push({ word, by: WORD_CHAIN_SPEAKER.USER, at: now });
  usedSet.add(word);

  const botPick = await botPicker.pickBotWord({
    startLetter: word.slice(-1),
    level: game.level,
    usedWords: usedSet,
  });

  if (!botPick) {
    return endGame(game, WORD_CHAIN_FAIL_REASON.BOT_CANT_CONTINUE, new Date());
  }

  game.words.push({
    word: botPick.word,
    by: WORD_CHAIN_SPEAKER.BOT,
    source: botPick.source,
    at: new Date(),
  });
  game.turnStartedAt = new Date();
  await game.save();
  return toResponse(game);
}

async function endGame(game, failReason, now) {
  game.status = WORD_CHAIN_STATUS.ENDED;
  game.failReason = failReason;
  game.finalScore = countUserWords(game.words);
  game.endedAt = now;
  await game.save();
  return toResponse(game);
}

export async function giveUp({ userId, gameId }) {
  return withVersionRetry(async () => {
    const game = await WordChainGame.findOne({ _id: gameId, userId });
    if (!game) throw ApiError.notFound("Game not found");
    if (game.status !== WORD_CHAIN_STATUS.ACTIVE) {
      throw ApiError.badRequest("Game already ended");
    }
    return endGame(game, WORD_CHAIN_FAIL_REASON.GAVE_UP, new Date());
  });
}

export async function getActive({ userId }) {
  return withVersionRetry(async () => {
    const game = await WordChainGame.findOne({
      userId,
      status: WORD_CHAIN_STATUS.ACTIVE,
    }).sort({ createdAt: -1 });
    if (!game) return null;

    const timeLimit = TIME_LIMIT_PER_LEVEL_MS[game.level];
    if (Date.now() - game.turnStartedAt > timeLimit) {
      return endGame(game, WORD_CHAIN_FAIL_REASON.TIMEOUT, new Date());
    }
    return toResponse(game);
  });
}

export async function getMyGame({ userId, gameId }) {
  const game = await WordChainGame.findOne({ _id: gameId, userId });
  if (!game) throw ApiError.notFound("Game not found");
  return toResponse(game);
}

export async function listMyGames({ userId, level, page = 1, limit = 20 }) {
  const p = Math.max(1, Number(page));
  const l = Math.min(Math.max(1, Number(limit)), 50);
  const skip = (p - 1) * l;

  const filter = {
    userId,
    failReason: { $ne: WORD_CHAIN_FAIL_REASON.ABANDONED },
  };
  if (level) {
    validateLevel(level);
    filter.level = level;
  }

  const [items, total] = await Promise.all([
    WordChainGame.find(filter)
      .select("level status finalScore failReason words createdAt endedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
      .lean(),
    WordChainGame.countDocuments(filter),
  ]);

  return {
    items: items.map((g) => ({
      id: String(g._id),
      level: g.level,
      status: g.status,
      finalScore: g.finalScore,
      failReason: g.failReason,
      didWin: g.failReason === WORD_CHAIN_FAIL_REASON.BOT_CANT_CONTINUE,
      wordCount: g.words.length,
      createdAt: g.createdAt,
      endedAt: g.endedAt,
    })),
    total,
  };
}

export async function getMyBestScores({ userId }) {
  const results = await WordChainGame.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: WORD_CHAIN_STATUS.ENDED,
        failReason: { $ne: WORD_CHAIN_FAIL_REASON.ABANDONED },
      },
    },
    {
      $group: {
        _id: "$level",
        bestScore: { $max: "$finalScore" },
        totalGames: { $sum: 1 },
      },
    },
  ]);

  const byLevel = Object.fromEntries(
    Object.values(WORD_CHAIN_LEVEL).map((lv) => [
      lv,
      { bestScore: 0, totalGames: 0 },
    ]),
  );
  for (const r of results) {
    byLevel[r._id] = { bestScore: r.bestScore, totalGames: r.totalGames };
  }
  return byLevel;
}
