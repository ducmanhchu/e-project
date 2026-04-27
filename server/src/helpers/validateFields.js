import mongoose from "mongoose";
import { ApiError } from "@server/helpers/ApiError";

/**
 * @param {Object} obj
 * @param {Array} fields
 * @returns {void || Error}
 */
export function validateFields(obj = {}, fields = []) {
  if (!fields.length) return;
  for (const field of fields) {
    if (obj[field] == null || obj[field] === "") throw ApiError.badRequest(`Missing required field: ${field}`);
  }
}

/**
 * Throws 400 if id is not a valid Mongo ObjectId.
 */
export function validateObjectId(id, fieldName = "id") {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest(`Invalid ${fieldName}`);
  }
}
