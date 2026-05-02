import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/shared/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { resendVerification, verifyEmail } from "@/shared/api/auth";

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

function normalizeEmail(raw: string) {
	return raw.trim().toLowerCase();
}

function resendCooldownKey(email: string) {
	return `auth:email-verify:resendAt:${email}`;
}

function getLastResendAt(email: string): number | null {
	try {
		const v = localStorage.getItem(resendCooldownKey(email));
		if (!v) return null;
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	} catch {
		return null;
	}
}

function setLastResendAt(email: string, ts: number) {
	try {
		localStorage.setItem(resendCooldownKey(email), String(ts));
	} catch {
		console.error("Failed to set last resend at");
	}
}

function formatRemaining(ms: number) {
	const totalSec = Math.max(0, Math.ceil(ms / 1000));
	const m = Math.floor(totalSec / 60);
	const s = totalSec % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

export function VerifyEmail() {
	const navigate = useNavigate();
	const [params] = useSearchParams();
	const token = params.get("token") ?? "";
	const initialEmail = params.get("email") ?? "";

	const [email, setEmail] = useState(initialEmail);
	const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);

	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, []);

	const verifyMutation = useMutation({
		mutationFn: verifyEmail,
	});

	const resendMutation = useMutation({
		mutationFn: resendVerification,
		onSuccess: () => {
			if (normalizedEmail) setLastResendAt(normalizedEmail, Date.now());
		},
	});

	useEffect(() => {
		if (!token) return;
		if (verifyMutation.isPending || verifyMutation.isSuccess) return;
		verifyMutation.mutate({ token });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]);

	const lastResendAt = normalizedEmail
		? getLastResendAt(normalizedEmail)
		: null;
	const remainingMs =
		lastResendAt === null ? 0 : RESEND_COOLDOWN_MS - (now - lastResendAt);
	const canResend = Boolean(normalizedEmail) && remainingMs <= 0;

	const verifyErrorMessage = useMemo(() => {
		if (!verifyMutation.isError) return null;
		const err = verifyMutation.error;
		if (isAxiosError(err)) {
			return (
				(err.response?.data as { message?: string } | undefined)?.message ??
				"Xác thực thất bại, vui lòng thử lại"
			);
		}
		return "Xác thực thất bại, vui lòng thử lại";
	}, [verifyMutation.error, verifyMutation.isError]);

	const resendErrorMessage = useMemo(() => {
		if (!resendMutation.isError) return null;
		const err = resendMutation.error;
		if (isAxiosError(err)) {
			const status = err.response?.status;
			const serverMsg = (err.response?.data as { message?: string } | undefined)
				?.message;
			if (status === 409) return serverMsg ?? "Email đã được xác thực";
			return serverMsg ?? "Gửi lại email xác thực thất bại, vui lòng thử lại";
		}
		return "Gửi lại email xác thực thất bại, vui lòng thử lại";
	}, [resendMutation.error, resendMutation.isError]);

	const onResend = () => {
		if (!canResend) return;
		resendMutation.mutate({ email: normalizedEmail });
	};

	const isVerifying = Boolean(token) && verifyMutation.isPending;
	const verifiedOk = Boolean(token) && verifyMutation.isSuccess;
	const verifiedFail = Boolean(token) && verifyMutation.isError;

	return (
		<div className="flex flex-col min-h-svh items-center justify-center px-6 md:px-0">
			<div className="w-full max-w-md">
				<FieldGroup>
					{!verifiedOk && !verifiedFail && !isVerifying && (
						<div className="flex flex-col items-center gap-2 text-center">
							<h1 className="font-heading text-xl font-medium">
								Xác thực tài khoản
							</h1>
							<FieldDescription>
								{token ? (
									<span>Chúng tôi đang xác thực tài khoản của bạn</span>
								) : (
									<span className="text-center">
										Liên kết đã được gửi tới hộp thư của bạn.
									</span>
								)}
							</FieldDescription>
						</div>
					)}

					{isVerifying && (
						<Field>
							<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
								<HugeiconsIcon
									icon={Loading03Icon}
									className="size-4 animate-spin"
								/>
								Đang xác thực…
							</div>
						</Field>
					)}

					{verifiedOk && (
						<Field className="flex flex-col items-center gap-8">
							<div className="flex flex-col items-center gap-2">
								<h1 className="text-xl font-medium">Xác thực thành công</h1>
								<p className="text-sm text-muted-foreground">
									Bạn có thể đăng nhập ngay bây giờ.
								</p>
							</div>
							<Button onClick={() => navigate("/login", { replace: true })}>
								Đăng nhập
							</Button>
						</Field>
					)}

					{verifiedFail && (
						<Field>
							<FieldError className="text-center text-xl font-medium">
								{verifyErrorMessage}
							</FieldError>
						</Field>
					)}

					{!verifiedOk && (
						<>
							<Field>
								<FieldLabel htmlFor="email">Email đã đăng ký</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="m@example.com"
									autoComplete="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={resendMutation.isPending}
								/>
							</Field>

							<Field>
								{resendErrorMessage && (
									<FieldError className="text-center">
										{resendErrorMessage}
									</FieldError>
								)}
								<Button
									type="button"
									onClick={onResend}
									disabled={!canResend || resendMutation.isPending}
								>
									{resendMutation.isPending && (
										<HugeiconsIcon
											icon={Loading03Icon}
											className="size-4 animate-spin"
										/>
									)}
									Gửi lại tin nhắn xác thực
								</Button>
								{!canResend && normalizedEmail && remainingMs > 0 && (
									<p className="text-center text-xs text-muted-foreground">
										Bạn có thể gửi lại sau {formatRemaining(remainingMs)}.
									</p>
								)}
							</Field>

							<FieldDescription className="text-center">
								Đã xác thực rồi? <Link to="/login">Đăng nhập</Link>
							</FieldDescription>
						</>
					)}
				</FieldGroup>
			</div>
		</div>
	);
}
