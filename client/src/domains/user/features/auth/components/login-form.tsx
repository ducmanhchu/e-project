import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import * as z from "zod";
import { useNavigate, Link } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/components/logo";
import { Button } from "@/shared/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
	FieldError,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useAuthStore } from "@/shared/store/use-auth-store";
import { signIn } from "@/shared/api/auth";
import type { SignInResponse } from "@/shared/types/auth";

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
									<a
										href="#"
										className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									>
										Quên mật khẩu?
									</a>
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
						<Button variant="outline" type="button" disabled={login.isPending}>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
								<path
									d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
									fill="currentColor"
								/>
							</svg>
							Tiếp tục với Google
						</Button>
					</Field>
				</FieldGroup>
			</form>
		</div>
	);
}
