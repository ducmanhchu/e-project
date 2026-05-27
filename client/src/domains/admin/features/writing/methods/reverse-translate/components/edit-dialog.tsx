import { useCallback, useState } from "react";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import {
	fetchAdminRTExercise,
	updateAdminRTExercise,
} from "@shared/api/reverse-translate";
import type {
	AdminRTExercise,
	RTPreviewSentence,
} from "@shared/types/reverse-translate";
import { Button } from "@shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";
import { Skeleton } from "@shared/components/ui/skeleton";

import {
	ADMIN_RT_LIST_QUERY_KEY,
	adminRTExerciseQueryKey,
} from "@admin/features/writing/methods/reverse-translate/components/form-options";
import { RTMetadataFields } from "@admin/features/writing/methods/reverse-translate/components/metadata-fields";
import { RTCreateSentenceList } from "@admin/features/writing/methods/reverse-translate/components/create-sentence-list";
import { RTCreateVocabularyTable } from "@admin/features/writing/methods/reverse-translate/components/create-vocabulary-table";
import {
	buildUpdatePayload,
	createManualVocabEntry,
	exerciseToEditFormValues,
	exerciseToSentences,
	exerciseToVocabulary,
	getApiErrorMessage,
	rtEditFormSchema,
	validateStep2BeforeSave,
	type RTEditFormValues,
	type RTEditableVocab,
} from "@admin/features/writing/methods/reverse-translate/components/form-utils";

type RTEditDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	exerciseId: string | null;
};

type RTEditFormProps = {
	exercise: AdminRTExercise;
	exerciseId: string;
	onOpenChange: (open: boolean) => void;
};

/** Form sửa bài — tách component để chỉ mount sau khi fetch xong (tránh re-render thừa) */
function RTEditForm({ exercise, exerciseId, onOpenChange }: RTEditFormProps) {
	const queryClient = useQueryClient();
	const [sentences, setSentences] = useState<RTPreviewSentence[]>(() =>
		exerciseToSentences(exercise),
	);
	const [vocabulary, setVocabulary] = useState<RTEditableVocab[]>(() =>
		exerciseToVocabulary(exercise),
	);

	const form = useForm<RTEditFormValues>({
		resolver: zodResolver(rtEditFormSchema),
		defaultValues: exerciseToEditFormValues(exercise),
	});

	const updateMutation = useMutation({
		mutationFn: async (values: RTEditFormValues) => {
			const validationError = validateStep2BeforeSave(sentences);
			if (validationError) throw new Error(validationError);

			// Gửi toàn bộ câu và từ vựng — backend ghi đè khi cập nhật
			return updateAdminRTExercise(
				exerciseId,
				buildUpdatePayload(values, sentences, vocabulary),
			);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ADMIN_RT_LIST_QUERY_KEY,
			});
			await queryClient.invalidateQueries({
				queryKey: adminRTExerciseQueryKey(exerciseId),
			});
			toast.success("Cập nhật bài tập thành công");
			onOpenChange(false);
		},
		onError: (error) => {
			if (error instanceof Error && !isAxiosError(error)) {
				toast.error(error.message);
				return;
			}
			toast.error(
				getApiErrorMessage(
					error,
					"Không thể cập nhật bài tập. Vui lòng thử lại.",
				),
			);
		},
	});

	const isPending = updateMutation.isPending;

	const updateSentence = useCallback(
		(
			index: number,
			field: "referenceAnswer" | "vietnameseText",
			value: string,
		) => {
			setSentences((prev) =>
				prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
			);
		},
		[],
	);

	const updateVocabSentenceIndex = useCallback(
		(index: number, sentenceIndex: number) => {
			setVocabulary((prev) =>
				prev.map((v, i) => (i === index ? { ...v, sentenceIndex } : v)),
			);
		},
		[],
	);

	const updateVocabWord = useCallback((index: number, word: string) => {
		setVocabulary((prev) =>
			prev.map((v, i) => (i === index ? { ...v, word } : v)),
		);
	}, []);

	const addVocabRow = useCallback(() => {
		setVocabulary((prev) => [...prev, createManualVocabEntry(1)]);
	}, []);

	const removeVocabRow = useCallback((index: number) => {
		setVocabulary((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const onSubmit = form.handleSubmit((values) => {
		updateMutation.mutate(values);
	});

	return (
		<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
			<RTMetadataFields control={form.control} disabled={isPending} />

			<RTCreateSentenceList
				sentences={sentences}
				disabled={isPending}
				onUpdateSentence={updateSentence}
			/>

			<RTCreateVocabularyTable
				vocabulary={vocabulary}
				sentenceCount={sentences.length}
				disabled={isPending}
				onAdd={addVocabRow}
				onUpdateSentenceIndex={updateVocabSentenceIndex}
				onUpdateWord={updateVocabWord}
				onRemove={removeVocabRow}
			/>

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
					{isPending ? (
						<HugeiconsIcon
							icon={Loading02Icon}
							className="size-4 animate-spin"
						/>
					) : null}
					Cập nhật
				</Button>
			</DialogFooter>
		</form>
	);
}

export function RTEditDialog({
	open,
	onOpenChange,
	exerciseId,
}: RTEditDialogProps) {
	const {
		data: exerciseRes,
		isLoading,
		isError,
	} = useQuery({
		queryKey: adminRTExerciseQueryKey(exerciseId ?? ""),
		queryFn: () => fetchAdminRTExercise(exerciseId!),
		enabled: open && !!exerciseId,
	});

	const exercise = exerciseRes?.data;
	const showForm = !isLoading && !isError && !!exercise && !!exerciseId;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton
				className="sm:max-w-5xl max-h-[90vh] overflow-y-auto no-scrollbar"
				aria-describedby={undefined}
			>
				<DialogHeader>
					<DialogTitle>Sửa bài tập</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<div className="flex flex-col gap-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				) : null}

				{isError ? (
					<p className="text-sm text-muted-foreground">
						Không thể tải thông tin bài tập. Vui lòng thử lại sau.
					</p>
				) : null}

				{showForm ? (
					<RTEditForm
						key={exerciseId}
						exercise={exercise}
						exerciseId={exerciseId}
						onOpenChange={onOpenChange}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
