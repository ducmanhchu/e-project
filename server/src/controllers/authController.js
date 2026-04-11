import * as userService from "@server/services/userService";
import * as authService from "@server/services/authService";
import { TOKEN_LIFE } from "@server/const/auth";

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
