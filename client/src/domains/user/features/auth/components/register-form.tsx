import * as z from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { useNavigate, Link } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { GoogleLogin } from "@react-oauth/google";

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

import type { GoogleLoginResponse } from "@shared/types/auth";
import { cn } from "@shared/lib/utils";
import { googleLogin, signUp } from "@shared/api/auth";
import { toast } from "sonner";
import { queryClient } from "@shared/lib/query-client";
import { useAuthStore } from "@shared/store/use-auth-store";

const RegisterSchema = z
	.object({
		fullName: z.string().trim().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
		email: z.email("Email không hợp lệ"),
		password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
		confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		path: ["confirmPassword"],
		message: "Mật khẩu nhập lại không khớp",
	});

type RegisterValues = z.infer<typeof RegisterSchema>;

export function RegisterForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const navigate = useNavigate();
	const setAccessToken = useAuthStore((s) => s.setAccessToken);

	const form = useForm<RegisterValues>({
		resolver: zodResolver(RegisterSchema),
		defaultValues: {
			fullName: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	const register = useMutation({
		mutationFn: signUp,
		onSuccess: (_data, variables) => {
			const email = variables?.email ? encodeURIComponent(variables.email) : "";
			navigate(`/verify-email${email ? `?email=${email}` : ""}`, {
				replace: true,
			});
		},
		onError: (error) => {
			let message = "Có lỗi xảy ra, vui lòng thử lại";
			if (isAxiosError(error)) {
				if (error.response?.status === 409) {
					message = "Email đã được sử dụng";
				} else if (error.response?.status === 400) {
					message = "Dữ liệu không hợp lệ, vui lòng kiểm tra lại";
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
		const { fullName, email, password } = values;
		register.mutate({ fullName, email, password });
	});

	const serverError = form.formState.errors.root?.message;

	return (
		<div className={cn("flex flex-col", className)} {...props}>
			<form onSubmit={onSubmit} noValidate>
				<FieldGroup>
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="font-heading text-xl font-medium">
							Đăng ký tài khoản
						</h1>
						<FieldDescription>
							Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
						</FieldDescription>
					</div>

					<Controller
						name="fullName"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Họ và tên</FieldLabel>
								<Input
									{...field}
									id={field.name}
									type="text"
									placeholder="Nguyễn Văn A"
									autoComplete="name"
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

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
								<FieldLabel htmlFor={field.name}>Mật khẩu</FieldLabel>
								<FieldDescription>
									Mật khẩu phải có ít nhất 8 ký tự
								</FieldDescription>
								<Input
									{...field}
									id={field.name}
									type="password"
									placeholder="••••••"
									autoComplete="new-password"
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Controller
						name="confirmPassword"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Nhập lại mật khẩu</FieldLabel>
								<Input
									{...field}
									id={field.name}
									type="password"
									placeholder="••••••"
									autoComplete="new-password"
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
						<Button type="submit" disabled={register.isPending}>
							{register.isPending && (
								<HugeiconsIcon
									icon={Loading03Icon}
									className="size-4 animate-spin"
								/>
							)}
							Đăng ký
						</Button>
					</Field>

					<FieldSeparator>Hoặc</FieldSeparator>

					<Field>
						<div className="flex w-full justify-center [&>div]:w-full!">
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
								text="signup_with"
							/>
						</div>
					</Field>
				</FieldGroup>
			</form>
		</div>
	);
}
