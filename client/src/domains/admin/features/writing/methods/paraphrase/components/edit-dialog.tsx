import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";

import {
	fetchAdminParaphraseExercise,
	updateParaphraseExercise,
} from "@shared/api/paraphrase";
import type {
	AdminParaphraseListItem,
	UpdateParaphraseExercisePayload,
} from "@shared/types/paraphrase";
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
import { Skeleton } from "@shared/components/ui/skeleton";
import { toast } from "sonner";

import { ParaphraseEditSentenceTable } from "@admin/features/writing/methods/paraphrase/components/edit-sentence-table";
import {
	ADMIN_PARAPHRASE_LIST_QUERY_KEY,
	adminParaphraseExerciseQueryKey,
} from "@admin/features/writing/methods/paraphrase/components/form-options";
import {
	createEmptyEditableSentence,
	exerciseToEditableSentences,
	exerciseToFormValues,
	getApiErrorMessage,
	paraphraseEditFormSchema,
	toSentencesUpdatePayload,
	type ParaphraseEditFormValues,
	type ParaphraseEditableSentence,
} from "@admin/features/writing/methods/paraphrase/components/paraphrase-form-utils";

const levelSection = baseFilterSections.find((s) => s.id === "level")!;
const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

function getOptionLabel(
	section: (typeof baseFilterSections)[number],
	value: string,
) {
	return section.options.find((o) => o.id === value)?.label;
}

type ParaphraseEditDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	exerciseId: string;
};

type ParaphraseEditFormProps = {
	exercise: AdminParaphraseListItem;
	exerciseId: string;
	onOpenChange: (open: boolean) => void;
};

function ParaphraseEditForm({
	exercise,
	exerciseId,
	onOpenChange,
}: ParaphraseEditFormProps) {
	const queryClient = useQueryClient();
	const [sentences, setSentences] = useState<ParaphraseEditableSentence[]>(() =>
		exerciseToEditableSentences(exercise),
	);
	const [sentencesError, setSentencesError] = useState<string | null>(null);

	const form = useForm<ParaphraseEditFormValues>({
		resolver: zodResolver(paraphraseEditFormSchema),
		defaultValues: exerciseToFormValues(exercise),
	});

	const updateMutation = useMutation({
		mutationFn: async (values: ParaphraseEditFormValues) => {
			const payload: UpdateParaphraseExercisePayload = {
				title: values.title.trim(),
				level: values.level,
				topic: values.topic,
				sentences: toSentencesUpdatePayload(sentences),
			};

			return updateParaphraseExercise(exerciseId, payload);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ADMIN_PARAPHRASE_LIST_QUERY_KEY,
			});
			await queryClient.invalidateQueries({
				queryKey: adminParaphraseExerciseQueryKey(exerciseId),
			});
			toast.success("Cập nhật bài tập thành công");
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(
				getApiErrorMessage(
					error,
					"Không thể cập nhật bài tập. Vui lòng thử lại.",
				),
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
		updateMutation.mutate(values);
	});

	const isPending = updateMutation.isPending;

	return (
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
								disabled={isPending}
								aria-invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
										<SelectValue placeholder={levelSection.label}>
											{getOptionLabel(levelSection, field.value)}
										</SelectValue>
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
										<SelectValue placeholder={topicSection.label}>
											{getOptionLabel(topicSection, field.value)}
										</SelectValue>
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
					Cập nhật
				</Button>
			</DialogFooter>
		</form>
	);
}

export function ParaphraseEditDialog({
	open,
	onOpenChange,
	exerciseId,
}: ParaphraseEditDialogProps) {
	const {
		data: exerciseRes,
		isLoading,
		isError,
	} = useQuery({
		queryKey: adminParaphraseExerciseQueryKey(exerciseId),
		queryFn: () => fetchAdminParaphraseExercise(exerciseId),
		enabled: open && !!exerciseId,
	});

	const exercise = exerciseRes?.data;
	const showForm = !isLoading && !isError && !!exercise;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton
				className="sm:max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar"
				aria-describedby={undefined}
			>
				<DialogHeader>
					<DialogTitle>Cập nhật bài tập</DialogTitle>
				</DialogHeader>

				{isLoading && (
					<div className="flex flex-col gap-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-24 w-full" />
					</div>
				)}

				{isError && (
					<p className="text-sm text-muted-foreground">
						Không thể tải thông tin bài tập. Vui lòng thử lại sau.
					</p>
				)}

				{showForm && (
					<ParaphraseEditForm
						key={exerciseId}
						exercise={exercise}
						exerciseId={exerciseId}
						onOpenChange={onOpenChange}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
