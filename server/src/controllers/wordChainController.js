import mongoose from "mongoose";
import { ApiError } from "@server/helpers/ApiError";
import * as wordChainService from "@server/services/wordChain/wordChainService";

function validateGameId(gameId) {
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    throw ApiError.badRequest("Invalid gameId");
  }
}

export async function startGame(req, res, next) {
  try {
    const game = await wordChainService.startGame({
      userId: req.user.id,
      level: req.body?.level,
    });
    res.status(201).json({ success: true, data: game });
  } catch (e) {
    next(e);
  }
}

export async function submit(req, res, next) {
  try {
    validateGameId(req.params.gameId);
    const game = await wordChainService.submitWord({
      userId: req.user.id,
      gameId: req.params.gameId,
      word: req.body?.word,
    });
    res.status(200).json({ success: true, data: game });
  } catch (e) {
    next(e);
  }
}

export async function giveUp(req, res, next) {
  try {
    validateGameId(req.params.gameId);
    const game = await wordChainService.giveUp({
      userId: req.user.id,
      gameId: req.params.gameId,
    });
    res.status(200).json({ success: true, data: game });
  } catch (e) {
    next(e);
  }
}

export async function getGame(req, res, next) {
  try {
    validateGameId(req.params.gameId);
    const game = await wordChainService.getMyGame({
      userId: req.user.id,
      gameId: req.params.gameId,
    });
    res.status(200).json({ success: true, data: game });
  } catch (e) {
    next(e);
  }
}

export async function getActive(req, res, next) {
  try {
    const game = await wordChainService.getActive({ userId: req.user.id });
    res.status(200).json({ success: true, data: game });
  } catch (e) {
    next(e);
  }
}

export async function listMyGames(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, parseInt(req.query.limit || "20", 10));
    const out = await wordChainService.listMyGames({
      userId: req.user.id,
      level: req.query.level,
      page,
      limit,
    });
    res.status(200).json({ success: true, data: out });
  } catch (e) {
    next(e);
  }
}

export async function getBestScores(req, res, next) {
  try {
    const out = await wordChainService.getMyBestScores({ userId: req.user.id });
    res.status(200).json({ success: true, data: out });
  } catch (e) {
    next(e);
  }
}
