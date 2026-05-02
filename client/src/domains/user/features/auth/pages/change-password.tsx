import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import * as z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { changePassword } from "@/shared/api/auth";

const ChangePasswordSchema = z
	.object({
		oldPassword: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
		newPassword: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
		confirmNewPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu mới"),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		path: ["confirmNewPassword"],
		message: "Mật khẩu nhập lại không khớp",
	});

type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;

export function ChangePassword() {
	const form = useForm<ChangePasswordValues>({
		resolver: zodResolver(ChangePasswordSchema),
		defaultValues: {
			oldPassword: "",
			newPassword: "",
			confirmNewPassword: "",
		},
	});

	const mutation = useMutation({
		mutationFn: changePassword,
		onSuccess: (data) => {
			if (data.success) {
				form.reset();
				toast.success("Đổi mật khẩu thành công");
				return;
			}
			form.setError("root", {
				message: data.message || "Có lỗi xảy ra, vui lòng thử lại",
			});
		},
		onError: (error) => {
			let message = "Có lỗi xảy ra, vui lòng thử lại";
			if (isAxiosError(error) && error.response?.status === 400) {
				message = "Mật khẩu cũ không đúng";
			}
			form.setError("root", { message });
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		form.clearErrors("root");
		mutation.mutate({
			oldPassword: values.oldPassword,
			newPassword: values.newPassword,
		});
	});

	const serverError = form.formState.errors.root?.message;

	return (
		<div className="mx-auto flex w-full max-w-md flex-col gap-6">
			<div className="flex flex-col gap-2 text-center">
				<h1 className="text-2xl font-extrabold">Thay đổi mật khẩu</h1>
				<p className="text-sm text-muted-foreground">
					Cập nhật mật khẩu cho tài khoản của bạn
				</p>
			</div>

			<form onSubmit={onSubmit} noValidate>
				<FieldGroup>
					<Controller
						name="oldPassword"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Mật khẩu cũ</FieldLabel>
								<Input
									{...field}
									id={field.name}
									type="password"
									placeholder="••••••••"
									autoComplete="current-password"
									aria-invalid={fieldState.invalid}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Controller
						name="newPassword"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>Mật khẩu mới</FieldLabel>
								<FieldDescription>
									Mật khẩu phải có ít nhất 8 ký tự
								</FieldDescription>
								<Input
									{...field}
									id={field.name}
									type="password"
									placeholder="••••••••"
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
							Đổi mật khẩu
						</Button>
					</Field>
				</FieldGroup>
			</form>
		</div>
	);
}
