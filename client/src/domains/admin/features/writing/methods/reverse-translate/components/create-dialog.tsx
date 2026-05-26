import { useCallback, useState } from "react";
import { isAxiosError } from "axios";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import {
	createAdminRTExercise,
	previewAdminRTExercise,
	saveAdminRTDictionary,
} from "@shared/api/reverse-translate";
import type { RTPreviewSentence } from "@shared/types/reverse-translate";
import { Button } from "@shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@shared/components/ui/field";
import { Textarea } from "@shared/components/ui/textarea";

import { ADMIN_RT_LIST_QUERY_KEY } from "@admin/features/writing/methods/reverse-translate/components/form-options";
import { RTMetadataFields } from "@admin/features/writing/methods/reverse-translate/components/metadata-fields";
import { RTCreateSentenceList } from "@admin/features/writing/methods/reverse-translate/components/create-sentence-list";
import { RTCreateVocabularyTable } from "@admin/features/writing/methods/reverse-translate/components/create-vocabulary-table";
import {
	buildVietnameseParagraph,
	createManualVocabEntry,
	extractLessonId,
	getApiErrorMessage,
	mapPreviewVocabulary,
	rtCreateStep1DefaultValues,
	rtCreateStep1Schema,
	toDictionaryPayload,
	validateStep2BeforeSave,
	type RTCreateStep1Values,
	type RTEditableVocab,
	type RTMetadataValues,
} from "@admin/features/writing/methods/reverse-translate/components/form-utils";

type RTCreateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const DIALOG_CLASS_STEP1 =
	"sm:max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar";
const DIALOG_CLASS_STEP2 =
	"sm:max-w-5xl max-h-[90vh] overflow-y-auto no-scrollbar";

/**
 * Dialog tạo bài dịch ngược — 2 bước: preview AI → review & lưu (create + dictionary).
 */
export function RTCreateDialog({ open, onOpenChange }: RTCreateDialogProps) {
	const queryClient = useQueryClient();
	const [step, setStep] = useState<1 | 2>(1);
	const [sentences, setSentences] = useState<RTPreviewSentence[]>([]);
	const [vocabulary, setVocabulary] = useState<RTEditableVocab[]>([]);

	const form = useForm<RTCreateStep1Values>({
		resolver: zodResolver(rtCreateStep1Schema),
		defaultValues: rtCreateStep1DefaultValues,
	});

	// Form create có thêm `paragraph`; RTMetadataFields chỉ bind 4 field metadata
	const metadataControl = form.control as unknown as Control<RTMetadataValues>;

	// Reset khi đóng dialog — gắn vào sự kiện thay vì useEffect để tránh cascading render
	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				setStep(1);
				setSentences([]);
				setVocabulary([]);
				form.reset(rtCreateStep1DefaultValues);
			}
			onOpenChange(nextOpen);
		},
		[form, onOpenChange],
	);

	const previewMutation = useMutation({
		mutationFn: (values: RTCreateStep1Values) =>
			previewAdminRTExercise({
				paragraph: values.paragraph.trim(),
				type: "reverse_translation",
				level: values.level,
				contentType: values.contentType,
				topic: values.topic,
				title: values.title.trim(),
			}),
		onSuccess: (response) => {
			const preview = response.data;
			setSentences(preview.sentences);
			setVocabulary(mapPreviewVocabulary(preview.vocabulary));
			setStep(2);
		},
		onError: (error) => {
			toast.error(
				getApiErrorMessage(
					error,
					"Không thể phân tích văn bản. Vui lòng thử lại.",
				),
			);
		},
	});

	const saveMutation = useMutation({
		mutationFn: async (values: RTCreateStep1Values) => {
			const validationError = validateStep2BeforeSave(sentences);
			if (validationError) throw new Error(validationError);

			const createRes = await createAdminRTExercise({
				title: values.title.trim(),
				type: "reverse_translation",
				level: values.level,
				topic: values.topic,
				contentType: values.contentType,
				vietnameseParagraph: buildVietnameseParagraph(sentences),
				sentences: sentences.map((s) => ({
					vietnameseText: s.vietnameseText.trim(),
					referenceAnswer: s.referenceAnswer.trim(),
				})),
			});

			const lessonId = extractLessonId(createRes.data);
			const dictEntries = toDictionaryPayload(vocabulary);

			if (dictEntries.length > 0) {
				await saveAdminRTDictionary(lessonId, dictEntries);
			}

			return lessonId;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ADMIN_RT_LIST_QUERY_KEY,
			});
			toast.success("Tạo bài tập thành công");
			handleOpenChange(false);
		},
		onError: (error) => {
			if (error instanceof Error && !isAxiosError(error)) {
				toast.error(error.message);
				return;
			}
			toast.error(
				getApiErrorMessage(error, "Không thể lưu bài tập. Vui lòng thử lại."),
			);
		},
	});

	const isPreviewPending = previewMutation.isPending;
	const isSavePending = saveMutation.isPending;
	const isBusy = isPreviewPending || isSavePending;

	const handleStep1Submit = form.handleSubmit((values) => {
		previewMutation.mutate(values);
	});

	const handleSave = form.handleSubmit((values) => {
		saveMutation.mutate(values);
	});

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

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				showCloseButton
				className={step === 1 ? DIALOG_CLASS_STEP1 : DIALOG_CLASS_STEP2}
			>
				<DialogHeader>
					<DialogTitle>
						Thêm bài tập
						<span className="ml-2 text-sm font-normal text-muted-foreground">
							Bước {step}/2
						</span>
					</DialogTitle>
				</DialogHeader>

				{step === 1 ? (
					<form
						onSubmit={handleStep1Submit}
						noValidate
						className="flex flex-col gap-4"
					>
						<RTMetadataFields control={metadataControl} disabled={isBusy} />

						<Controller
							name="paragraph"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="rt-create-paragraph">
										Văn bản tiếng Anh
									</FieldLabel>
									<Textarea
										{...field}
										id="rt-create-paragraph"
										placeholder="Nhập đoạn văn tiếng Anh gốc"
										disabled={isBusy}
										rows={6}
										className="min-h-32 resize-y"
										aria-invalid={fieldState.invalid}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								disabled={isBusy}
								onClick={() => handleOpenChange(false)}
							>
								Hủy
							</Button>
							<Button type="submit" variant="blackHover" disabled={isBusy}>
								{isPreviewPending ? (
									<HugeiconsIcon
										icon={Loading02Icon}
										className="size-4 animate-spin"
									/>
								) : null}
								Tạo
							</Button>
						</DialogFooter>
					</form>
				) : (
					<div className="flex flex-col gap-4">
						<RTMetadataFields control={metadataControl} disabled={isBusy} />

						<RTCreateSentenceList
							sentences={sentences}
							disabled={isBusy}
							onUpdateSentence={updateSentence}
						/>

						<div className="space-y-2">
							<RTCreateVocabularyTable
								vocabulary={vocabulary}
								sentenceCount={sentences.length}
								disabled={isBusy}
								onAdd={addVocabRow}
								onUpdateSentenceIndex={updateVocabSentenceIndex}
								onUpdateWord={updateVocabWord}
								onRemove={removeVocabRow}
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								disabled={isBusy}
								onClick={() => setStep(1)}
							>
								Quay lại
							</Button>
							<Button
								type="button"
								variant="blackHover"
								disabled={isBusy}
								onClick={handleSave}
							>
								{isSavePending ? (
									<HugeiconsIcon
										icon={Loading02Icon}
										className="size-4 animate-spin"
									/>
								) : null}
								Lưu
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
