import { useCallback, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";
import { toast } from "sonner";

import { ParaphraseEditSentenceTable } from "@admin/features/writing/methods/paraphrase/components/edit-sentence-table";
import { ADMIN_PARAPHRASE_LIST_QUERY_KEY } from "@admin/features/writing/methods/paraphrase/components/form-options";
import {
	createEmptyEditableSentence,
	createInitialEditableSentences,
	getApiErrorMessage,
	paraphraseCreateDefaultValues,
	paraphraseCreateFormSchema,
	toSentencesUpdatePayload,
	type ParaphraseCreateFormValues,
	type ParaphraseEditableSentence,
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
	const [sentences, setSentences] = useState<ParaphraseEditableSentence[]>(
		createInitialEditableSentences,
	);
	const [sentencesError, setSentencesError] = useState<string | null>(null);

	const form = useForm<ParaphraseCreateFormValues>({
		resolver: zodResolver(paraphraseCreateFormSchema),
		defaultValues: paraphraseCreateDefaultValues,
	});

	const resetAll = useCallback(() => {
		form.reset(paraphraseCreateDefaultValues);
		setSentences(createInitialEditableSentences());
		setSentencesError(null);
	}, [form]);

	// Reset khi đóng dialog — gắn vào sự kiện thay vì useEffect để tránh cascading render
	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) resetAll();
			onOpenChange(nextOpen);
		},
		[onOpenChange, resetAll],
	);

	const createMutation = useMutation({
		mutationFn: (values: ParaphraseCreateFormValues) =>
			createParaphraseExercise({
				title: values.title.trim(),
				level: values.level,
				topic: values.topic,
				sentences: toSentencesUpdatePayload(sentences),
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ADMIN_PARAPHRASE_LIST_QUERY_KEY,
			});
			toast.success("Tạo bài tập thành công");
			handleOpenChange(false);
		},
		onError: (error) => {
			toast.error(
				getApiErrorMessage(error, "Không thể tạo bài tập. Vui lòng thử lại."),
			);
		},
	});

	const updateTargetSentence = useCallback(
		(index: number, targetSentence: string) => {
			setSentences((prev) =>
				prev.map((sentence, i) =>
					i === index ? { ...sentence, targetSentence } : sentence,
				),
			);
			setSentencesError(null);
		},
		[],
	);

	const addSentence = useCallback(() => {
		setSentences((prev) => [...prev, createEmptyEditableSentence(prev)]);
		setSentencesError(null);
	}, []);

	const removeSentence = useCallback((index: number) => {
		setSentences((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const onSubmit = form.handleSubmit((values) => {
		const payload = toSentencesUpdatePayload(sentences);
		if (payload.length === 0) {
			setSentencesError("Vui lòng nhập ít nhất một câu hỏi");
			return;
		}

		setSentencesError(null);
		createMutation.mutate(values);
	});

	const isPending = createMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				showCloseButton
				className="sm:max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar"
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

						<ParaphraseEditSentenceTable
							label="Các câu hỏi"
							sentences={sentences}
							disabled={isPending}
							invalid={!!sentencesError}
							error={sentencesError ? { message: sentencesError } : undefined}
							onAdd={addSentence}
							onUpdateTargetSentence={updateTargetSentence}
							onRemove={removeSentence}
						/>
					</FieldGroup>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={isPending}
							onClick={() => handleOpenChange(false)}
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
							Tạo
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
