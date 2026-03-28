import { ApiError } from "@server/helpers/ApiError";

/**
 * @param {Object} obj
 * @param {Array} fields
 * @returns {void || Error}
 */
export function validateFields(obj = {}, fields = []) {
  if (!fields.length || !Object.keys(obj).length) return;
  for (const field of fields) {
    if (!obj[field]) throw ApiError.badRequest(`Missing required field: ${field}`);
  }
}
