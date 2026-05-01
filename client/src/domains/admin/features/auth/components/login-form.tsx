import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import * as z from "zod";
import { useNavigate, useSearchParams } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@shared/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@shared/components/ui/field";
import { Input } from "@shared/components/ui/input";
import { useAuthStore } from "@shared/store/use-auth-store";
import { signIn } from "@shared/api/auth";
import type { SignInResponse } from "@shared/types/auth";

const LoginSchema = z.object({
	email: z.email("Email không hợp lệ"),
	password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginValues = z.infer<typeof LoginSchema>;

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const setAccessToken = useAuthStore((s) => s.setAccessToken);

	const forbidden = searchParams.get("forbidden") === "1";

	const form = useForm<LoginValues>({
		resolver: zodResolver(LoginSchema),
		defaultValues: { email: "", password: "" },
	});

	const login = useMutation({
		mutationFn: signIn,
		onSuccess: (data: SignInResponse) => {
			setAccessToken(data.accessToken);
			queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
			navigate("/admin/back-translate", { replace: true });
		},
		onError: (error) => {
			const message =
				isAxiosError(error) && error.response?.status === 401
					? "Email hoặc mật khẩu không đúng"
					: "Có lỗi xảy ra, vui lòng thử lại";
			form.setError("root", { message });
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		form.clearErrors("root");
		login.mutate(values);
	});

	const serverError = form.formState.errors.root?.message;

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Đăng nhập</CardTitle>
					<CardDescription>
						Nhập email và mật khẩu để truy cập trang quản trị
					</CardDescription>
				</CardHeader>
				<CardContent>
					{forbidden && (
						<div
							role="alert"
							className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
						>
							<HugeiconsIcon icon={Shield01Icon} className="mt-0.5 size-4 shrink-0" />
							<span>
								Tài khoản của bạn không có quyền truy cập trang quản trị.
							</span>
						</div>
					)}
					<form onSubmit={onSubmit} noValidate>
						<FieldGroup>
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
											<a
												href="#"
												className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
											>
												Quên mật khẩu?
											</a>
										</div>
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
										<HugeiconsIcon icon={Loading02Icon} className="size-4 animate-spin" />
									)}
									Đăng nhập
								</Button>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
