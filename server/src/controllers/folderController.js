import * as folderService from "@server/services/folderService";
import { validateObjectId } from "@server/helpers/validateFields";
import { DECK_LIMITS } from "@server/const/deck";

export async function createFolder(req, res, next) {
  try {
    const data = await folderService.createFolder(req.user._id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function listMyFolders(req, res, next) {
  try {
    const { search, sortBy, order, page = 1, limit = 20 } = req.query;
    const p = Math.max(1, +page);
    const l = Math.min(Math.max(1, +limit), DECK_LIMITS.FOLDER_LIST_PAGE_SIZE_MAX);
    const { items, total } = await folderService.listMyFolders(
      req.user._id,
      { search, sortBy, order },
      { page: p, limit: l },
    );
    res.json({
      success: true,
      data: items,
      pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    });
  } catch (e) { next(e); }
}

export async function getMyFolderById(req, res, next) {
  try {
    validateObjectId(req.params.folderId, "folderId");
    const data = await folderService.getMyFolderById(
      req.user._id,
      req.params.folderId,
    );
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function updateFolder(req, res, next) {
  try {
    validateObjectId(req.params.folderId, "folderId");
    const data = await folderService.updateFolder(
      req.user._id,
      req.params.folderId,
      req.body,
    );
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function deleteFolder(req, res, next) {
  try {
    validateObjectId(req.params.folderId, "folderId");
    const data = await folderService.deleteFolder(
      req.user._id,
      req.params.folderId,
    );
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
