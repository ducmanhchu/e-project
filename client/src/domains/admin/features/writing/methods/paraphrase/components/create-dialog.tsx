import { useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";

import { createParaphraseExercise } from "@shared/api/paraphrase";
import { baseFilterSections } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@shared/components/ui/field";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";
import { toast } from "sonner";

import { ADMIN_PARAPHRASE_LIST_QUERY_KEY } from "@admin/features/writing/methods/paraphrase/components/form-options";
import {
	buildSentencesPayload,
	getApiErrorMessage,
	paraphraseCreateDefaultValues,
	paraphraseCreateFormSchema,
	type ParaphraseCreateFormValues,
} from "@admin/features/writing/methods/paraphrase/components/paraphrase-form-utils";

const levelSection = baseFilterSections.find((s) => s.id === "level")!;
const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

type ParaphraseCreateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ParaphraseCreateDialog({
	open,
	onOpenChange,
}: ParaphraseCreateDialogProps) {
	const queryClient = useQueryClient();

	const form = useForm<ParaphraseCreateFormValues>({
		resolver: zodResolver(paraphraseCreateFormSchema),
		defaultValues: paraphraseCreateDefaultValues,
	});

	const resetAll = useCallback(() => {
		form.reset(paraphraseCreateDefaultValues);
	}, [form]);

	useEffect(() => {
		if (!open) resetAll();
	}, [open, resetAll]);

	const createMutation = useMutation({
		mutationFn: (values: ParaphraseCreateFormValues) =>
			createParaphraseExercise({
				title: values.title.trim(),
				level: values.level,
				topic: values.topic,
				sentences: buildSentencesPayload(values.sentencesRaw),
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ADMIN_PARAPHRASE_LIST_QUERY_KEY,
			});
			toast.success("Tạo bài tập thành công");
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(
				getApiErrorMessage(error, "Không thể tạo bài tập. Vui lòng thử lại."),
			);
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		createMutation.mutate(values);
	});

	const isPending = createMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton
				className="sm:max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar"
			>
				<DialogHeader>
					<DialogTitle>Tạo mới bài tập</DialogTitle>
				</DialogHeader>

				<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
					<FieldGroup>
						<Controller
							name="title"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={field.name}>Tiêu đề</FieldLabel>
									<Input
										{...field}
										id={field.name}
										placeholder="Nhập tiêu đề bài tập"
										disabled={isPending}
										aria-invalid={fieldState.invalid}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<div className="grid gap-4 sm:grid-cols-2">
							<Controller
								name="level"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Cấp độ</FieldLabel>
										<Select
											value={field.value}
											onValueChange={field.onChange}
											disabled={isPending}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder={levelSection.label} />
											</SelectTrigger>
											<SelectContent>
												{levelSection.options.map((option) => (
													<SelectItem key={option.id} value={option.id}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>

							<Controller
								name="topic"
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel>Chủ đề</FieldLabel>
										<Select
											value={field.value}
											onValueChange={field.onChange}
											disabled={isPending}
										>
											<SelectTrigger className="w-full">
												<SelectValue placeholder={topicSection.label} />
											</SelectTrigger>
											<SelectContent>
												{topicSection.options.map((option) => (
													<SelectItem key={option.id} value={option.id}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{fieldState.invalid && (
											<FieldError errors={[fieldState.error]} />
										)}
									</Field>
								)}
							/>
						</div>

						<Controller
							name="sentencesRaw"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={field.name}>Các câu hỏi</FieldLabel>
									<Textarea
										{...field}
										id={field.name}
										placeholder="Câu hỏi 1; Câu hỏi 2; Câu hỏi 3"
										disabled={isPending}
										rows={6}
										className="min-h-32 resize-y"
										aria-invalid={fieldState.invalid}
									/>
									<p className="text-xs text-muted-foreground">
										Nhập các câu hỏi, ngăn cách bởi dấu chấm phẩy (;)
									</p>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					</FieldGroup>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={isPending}
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button type="submit" variant="blackHover" disabled={isPending}>
							{isPending && (
								<HugeiconsIcon
									icon={Loading02Icon}
									className="size-4 animate-spin"
								/>
							)}
							Tạo bài tập
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
