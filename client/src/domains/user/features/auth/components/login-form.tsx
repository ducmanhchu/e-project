import * as z from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { useNavigate, Link } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { GoogleLogin } from "@react-oauth/google";

import type { SignInResponse, GoogleLoginResponse } from "@shared/types/auth";

import { Logo } from "@shared/components/logo";
import { Button } from "@shared/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
	FieldError,
} from "@shared/components/ui/field";
import { Input } from "@shared/components/ui/input";
import { toast } from "sonner";

import { useAuthStore } from "@shared/store/use-auth-store";
import { cn } from "@shared/lib/utils";
import { googleLogin, signIn } from "@shared/api/auth";

const LoginSchema = z.object({
	email: z.email("Email không hợp lệ"),
	password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

type LoginValues = z.infer<typeof LoginSchema>;

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const setAccessToken = useAuthStore((s) => s.setAccessToken);

	const form = useForm<LoginValues>({
		resolver: zodResolver(LoginSchema),
		defaultValues: { email: "", password: "" },
	});

	const login = useMutation({
		mutationFn: signIn,
		onSuccess: (data: SignInResponse) => {
			setAccessToken(data.accessToken);
			queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
			navigate("/", { replace: true });
		},
		onError: (error) => {
			let message = "Có lỗi xảy ra, vui lòng thử lại";
			if (isAxiosError(error)) {
				const { status, data } = error.response || {};
				if (status === 401) {
					message = "Email hoặc mật khẩu không đúng";
				} else if (
					status === 403 &&
					data?.error ===
						"Email is not verified. Please check your inbox or call /auth/resend-verification"
				) {
					message = "Email chưa được xác thực - Hãy kiểm tra hộp thư của bạn.";
				}
			}
			form.setError("root", { message });
		},
	});

	const googleLoginMutation = useMutation({
		mutationFn: googleLogin,
		onSuccess: (data: GoogleLoginResponse) => {
			setAccessToken(data.accessToken);
			queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
			navigate("/", { replace: true });
		},
		onError: () => {
			toast.error("Có lỗi xảy ra, vui lòng thử lại");
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		form.clearErrors("root");
		login.mutate(values);
	});

	const serverError = form.formState.errors.root?.message;

	return (
		<div className={cn("flex flex-col", className)} {...props}>
			<form onSubmit={onSubmit} noValidate>
				<FieldGroup>
					<div className="flex flex-col items-center gap-2 text-center">
						<Link to="/" className="flex flex-col">
							<Logo />
						</Link>
						<h1 className="font-heading text-xl font-medium">
							Chào mừng tới với Wordwise
						</h1>
						<FieldDescription>
							Không có tài khoản? <Link to="/register">Đăng ký</Link>
						</FieldDescription>
					</div>

					<Controller
						name="email"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Email</FieldLabel>
								<Input
									{...field}
									id={field.name}
									type="email"
									placeholder="m@example.com"
									autoComplete="email"
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Controller
						name="password"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<div className="flex items-center">
									<FieldLabel htmlFor={field.name}>Mật khẩu</FieldLabel>
									<Link
										to="/forgot-password"
										className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									>
										Quên mật khẩu?
									</Link>
								</div>
								<FieldDescription>
									Mật khẩu phải có ít nhất 8 ký tự
								</FieldDescription>
								<Input
									{...field}
									id={field.name}
									type="password"
									placeholder="••••••"
									autoComplete="current-password"
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Field>
						{serverError && (
							<FieldError className="text-center">{serverError}</FieldError>
						)}
						<Button type="submit" disabled={login.isPending}>
							{login.isPending && (
								<HugeiconsIcon
									icon={Loading03Icon}
									className="size-4 animate-spin"
								/>
							)}
							Đăng nhập
						</Button>
					</Field>

					<FieldSeparator>Hoặc</FieldSeparator>

					<Field>
						<GoogleLogin
							onSuccess={(credentialResponse) => {
								googleLoginMutation.mutate({
									idToken: credentialResponse.credential as string,
								});
							}}
							onError={() => {
								toast.error("Có lỗi xảy ra, vui lòng thử lại");
							}}
							shape="pill"
						/>
					</Field>
				</FieldGroup>
			</form>
		</div>
	);
}
