import * as userService from "@server/services/userService";
import * as authService from "@server/services/authService";
import { TOKEN_LIFE } from "@server/const/auth";
import * as emailVerificationService from "@server/services/emailVerificationService";
import { ApiError } from "@server/helpers/ApiError";
import * as passwordService from "@server/services/passwordService";

// Kiểm tra xem có phải đang chạy trên Production (DigitalOcean) hay không
const isProduction = process.env.NODE_ENV === "production";

const REFRESH_TOKEN_OPTIONS = {
	httpOnly: true,
	// Nếu là Production thì bắt buộc phải true (chạy HTTPS). Nếu là Local thì false (chạy HTTP).
	secure: isProduction,
	// Nếu là Production thì dùng "none" để truyền cookie Cross-Site (Vercel <-> DigitalOcean).
	// Nếu là Local thì dùng "lax" để chạy bình thường qua proxy của Vite.
	sameSite: isProduction ? "none" : "lax",
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

export async function verifyEmail(req, res, next) {
	try {
		const token = req.body?.token;
		if (!token) throw ApiError.badRequest("Token is required");
		await emailVerificationService.verifyEmailByToken(token);
		res
			.status(200)
			.json({ success: true, message: "Email verified successfully" });
	} catch (e) {
		next(e);
	}
}

export async function resendVerification(req, res, next) {
	try {
		const email = req.body?.email;
		if (!email) throw ApiError.badRequest("email is required");
		await emailVerificationService.resend(email);
		res.status(200).json({
			success: true,
			message: "If the email exists, a verification link has been sent",
		});
	} catch (e) {
		next(e);
	}
}

export async function forgotPassword(req, res, next) {
	try {
		const email = req.body?.email;
		if (!email) throw ApiError.badRequest("email is required");
		await passwordService.requestPasswordReset(email);
		res.status(200).json({
			success: true,
			message: "If the email exists, a reset link has been sent",
		});
	} catch (e) {
		next(e);
	}
}

export async function resetPassword(req, res, next) {
	try {
		const { token, newPassword, confirmPassword } = req.body || {};
		if (!token) throw ApiError.badRequest("Token is required");
		if (newPassword !== confirmPassword) {
			throw ApiError.badRequest("Password confirmation does not match");
		}
		await passwordService.resetPassword(token, newPassword);
		res.status(200).json({
			success: true,
			message:
				"Password reset successfully. Please sign in with your new password.",
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
		res
			.status(200)
			.json({ success: true, message: "Password changed successfully" });
	} catch (e) {
		next(e);
	}
}
