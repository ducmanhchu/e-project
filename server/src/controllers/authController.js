import * as userService from "@server/services/userService";
import * as authService from "@server/services/authService";
import { TOKEN_LIFE } from "@server/const/auth";
import * as emailVerificationService from "@server/services/emailVerificationService";
import { ApiError } from "@server/helpers/ApiError";
import * as passwordService from "@server/services/passwordService";
import { renderTemplate } from "@server/helpers/renderTemplate";

const REFRESH_TOKEN_OPTIONS = {
	httpOnly: true,
	secure: false,
	sameSite: "lax",
	maxAge: TOKEN_LIFE.REFRESH_MAX_AGE_MS,
};

export async function signUp(req, res, next) {
	try {
		const data = await userService.createUser(req.body);
		res.status(201).json({ data, success: true });
	} catch (e) {
		next(e);
	}
}

export async function signIn(req, res, next) {
	try {
		const { accessToken, refreshToken } = await authService.signIn(req.body);
		res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_OPTIONS);
		res.status(200).json({ accessToken, success: true });
	} catch (e) {
		next(e);
	}
}

export async function signOut(req, res, next) {
	try {
		const token = req.cookies?.refreshToken;
		if (token) res.clearCookie("refreshToken");
		res.status(204).end();
	} catch (e) {
		next(e);
	}
}

export async function refreshToken(req, res, next) {
	try {
		const token = req.cookies?.refreshToken;
		const { accessToken } = await authService.refreshToken(token);
		res.status(200).json({ accessToken, success: true });
	} catch (e) {
		res.clearCookie("refreshToken");
		next(e);
	}
}

export async function googleSignIn(req, res, next) {
	try {
		const idToken = req.body?.idToken;
		const { accessToken, refreshToken, isNewUser } =
			await authService.googleLogin(idToken);
		res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_OPTIONS);
		res.status(200).json({ accessToken, isNewUser, success: true });
	} catch (e) {
		next(e);
	}
}

export async function verifyEmail(req, res) {
	try {
		await emailVerificationService.verifyEmailByToken(req.query?.token);
		res.status(200).type("html").send(renderSuccessHtml());
	} catch (err) {
		if (!(err instanceof ApiError)) {
			console.error("[verifyEmail] unexpected error:", err);
		}
		const status = err.statusCode || 500;
		const isApiError = err instanceof ApiError;
		const msg = isApiError ? err.message : "Đã có lỗi xảy ra, vui lòng thử lại";
		res.status(status).type("html").send(renderErrorHtml(msg));
	}
}

export async function resendVerification(req, res, next) {
	try {
		const email = req.body?.email;
		if (!email) throw ApiError.badRequest("email is required");
		await emailVerificationService.resend(email);
		res.status(200).json({
			success: true,
			message: "Nếu email tồn tại, link verify đã được gửi",
		});
	} catch (e) {
		next(e);
	}
}

function renderSuccessHtml() {
	return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Xác thực thành công</title></head>
<body style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 80px auto; padding: 20px; text-align: center;">
  <h1 style="color: #0a7e07;">✓ Xác thực thành công</h1>
  <p>Email của bạn đã được xác thực. Bạn có thể đóng trang này và quay lại đăng nhập.</p>
</body></html>`;
}

function renderErrorHtml(message) {
	return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Xác thực thất bại</title></head>
<body style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 80px auto; padding: 20px; text-align: center;">
  <h1 style="color: #c00;">✗ Xác thực thất bại</h1>
  <p>${escapeHtml(message)}</p>
  <p style="color: #666; font-size: 14px;">Nếu link đã hết hạn, vui lòng đăng nhập và yêu cầu gửi lại email.</p>
</body></html>`;
}

function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, (c) =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
	);
}

export async function forgotPassword(req, res, next) {
	try {
		const email = req.body?.email;
		if (!email) throw ApiError.badRequest("email is required");
		await passwordService.requestPasswordReset(email);
		res.status(200).json({
			success: true,
			message: "Nếu email tồn tại, link reset đã được gửi",
		});
	} catch (e) {
		next(e);
	}
}

export async function resetPassword(req, res, next) {
	try {
		const { token, newPassword, confirmPassword } = req.body || {};
		if (!token) throw ApiError.badRequest("Token thiếu");
		if (newPassword !== confirmPassword) {
			throw ApiError.badRequest("Xác nhận mật khẩu không khớp");
		}
		await passwordService.resetPassword(token, newPassword);
		res.status(200).json({
			success: true,
			message: "Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
		});
	} catch (e) {
		next(e);
	}
}

export async function changePassword(req, res, next) {
	try {
		const { oldPassword, newPassword } = req.body || {};
		if (!oldPassword) throw ApiError.badRequest("oldPassword is required");
		if (!newPassword) throw ApiError.badRequest("newPassword is required");
		await passwordService.changePassword(req.user.id, oldPassword, newPassword);
		res.status(200).json({ success: true, message: "Đã đổi mật khẩu" });
	} catch (e) {
		next(e);
	}
}
