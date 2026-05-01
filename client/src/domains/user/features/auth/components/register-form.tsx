import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import * as z from "zod";
import { useNavigate, Link } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { cn } from "@/shared/lib/utils";
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
import { signUp } from "@/shared/api/auth";

const RegisterSchema = z
	.object({
		fullName: z.string().trim().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
		email: z.email("Email không hợp lệ"),
		password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
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
		onSuccess: () => {
			navigate("/login", { replace: true });
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
									Mật khẩu phải có ít nhất 6 ký tự
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
						<Button
							variant="outline"
							type="button"
							disabled={register.isPending}
						>
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
