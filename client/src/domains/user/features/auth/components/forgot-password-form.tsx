import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import * as z from "zod";
import { Link } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { forgotPassword } from "@/shared/api/auth";

const ForgotPasswordSchema = z.object({
	email: z.email("Email không hợp lệ"),
});

type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;

export function ForgotPasswordForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const form = useForm<ForgotPasswordValues>({
		resolver: zodResolver(ForgotPasswordSchema),
		defaultValues: { email: "" },
	});

	const mutation = useMutation({
		mutationFn: forgotPassword,
		onSuccess: () => {
			form.clearErrors("root");
			form.setError("root", {
				message: "Chúng tôi đã gửi liên kết tới hòm thư của bạn.",
			});
		},
		onError: () => {
			form.setError("root", {
				message: "Chúng tôi đã gửi liên kết tới hòm thư của bạn.",
			});
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		form.clearErrors("root");
		mutation.mutate({ email: values.email.trim().toLowerCase() });
	});

	const serverMessage = form.formState.errors.root?.message;

	return (
		<div className={cn("flex flex-col", className)} {...props}>
			<form onSubmit={onSubmit} noValidate>
				<FieldGroup>
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="font-heading text-xl font-medium">
							Thiết lập mật khẩu
						</h1>
						<FieldDescription>
							Nhập email đã đăng ký để nhận liên kết để thiết lập mật khẩu.
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
									disabled={mutation.isPending}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Field>
						{serverMessage && (
							<FieldError className="text-center">{serverMessage}</FieldError>
						)}
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending && (
								<HugeiconsIcon
									icon={Loading03Icon}
									className="size-4 animate-spin"
								/>
							)}
							Gửi liên kết
						</Button>
					</Field>

					<FieldDescription className="text-center">
						Quay lại? <Link to="/login">Đăng nhập</Link>
					</FieldDescription>
				</FieldGroup>
			</form>
		</div>
	);
}
