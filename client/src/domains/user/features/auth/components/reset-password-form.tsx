import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import * as z from "zod";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { resetPassword } from "@/shared/api/auth";
import { toast } from "sonner";

const ResetPasswordSchema = z
	.object({
		newPassword: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
		confirmNewPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu mới"),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		path: ["confirmNewPassword"],
		message: "Mật khẩu nhập lại không khớp",
	});

type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

export function ResetPasswordForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const navigate = useNavigate();
	const [params] = useSearchParams();
	const token = params.get("token") ?? "";

	const form = useForm<ResetPasswordValues>({
		resolver: zodResolver(ResetPasswordSchema),
		defaultValues: { newPassword: "", confirmNewPassword: "" },
	});

	const mutation = useMutation({
		mutationFn: resetPassword,
		onSuccess: (data) => {
			if (data.success) {
				navigate("/login", { replace: true });
				toast.success("Mật khẩu đã được cập nhật thành công");
				return;
			}
			form.setError("root", {
				message: data.message || "Có lỗi xảy ra, vui lòng thử lại",
			});
		},
		onError: (error) => {
			let message = "Có lỗi xảy ra, vui lòng thử lại";
			if (isAxiosError(error) && error.response?.status === 400) {
				message =
					(error.response.data as { message?: string } | undefined)?.message ??
					"Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn";
			}
			form.setError("root", { message });
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		form.clearErrors("root");
		if (!token) {
			form.setError("root", {
				message: "Có lỗi xảy ra, vui lòng kiểm tra lại liên kết.",
			});
			return;
		}
		mutation.mutate({
			token,
			newPassword: values.newPassword,
			confirmPassword: values.confirmNewPassword,
		});
	});

	const serverError = form.formState.errors.root?.message;

	return (
		<div className={cn("flex flex-col", className)} {...props}>
			<form onSubmit={onSubmit} noValidate>
				<FieldGroup>
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="font-heading text-xl font-medium">
							Đặt lại mật khẩu
						</h1>
						<FieldDescription>
							Nhập mật khẩu mới cho tài khoản của bạn.
						</FieldDescription>
					</div>

					<Controller
						name="newPassword"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Mật khẩu mới</FieldLabel>
								<Input
									{...field}
									id={field.name}
									type="password"
									placeholder="••••••••"
									autoComplete="new-password"
									aria-invalid={fieldState.invalid}
									disabled={mutation.isPending}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Controller
						name="confirmNewPassword"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>
									Nhập lại mật khẩu mới
								</FieldLabel>
								<Input
									{...field}
									id={field.name}
									type="password"
									placeholder="••••••••"
									autoComplete="new-password"
									aria-invalid={fieldState.invalid}
									disabled={mutation.isPending}
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
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending && (
								<HugeiconsIcon
									icon={Loading03Icon}
									className="size-4 animate-spin"
								/>
							)}
							Cập nhật
						</Button>
					</Field>

					<FieldDescription className="text-center">
						Không có liên kết? <Link to="/forgot-password">Gửi lại</Link>
					</FieldDescription>
				</FieldGroup>
			</form>
		</div>
	);
}
