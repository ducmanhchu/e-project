import { ApiError } from "@server/helpers/ApiError";
import { validateFields } from "@server/helpers/validateFields";
import User from "@server/models/user/User";
import bcrypt from "bcrypt";

export async function createUser(data) {
  const { email, password, fullName } = data;

  validateFields(data, ["email", "password", "fullName"]);
  await checkUniqueEmail(email);

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    fullName: fullName.trim(),
  });
}

/**
 * @param {string} email
 * @param {string|null} excludeUserId
 */
export async function checkUniqueEmail(email, excludeUserId = null) {
  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail) throw ApiError.badRequest("Email is required");
  const existedUser = await User.findOne({ email: trimmedEmail });
  if (existedUser && existedUser.id !== excludeUserId) {
    throw ApiError.conflict("Email is already in use");
  }
}
