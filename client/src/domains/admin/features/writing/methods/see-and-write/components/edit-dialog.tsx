import { useCallback, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import * as z from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";

import {
	fetchSAWAdminExercise,
	updateSAWExercise,
	uploadSAWImage,
} from "@shared/api/see-and-write";
import type { SAWAdminExercise } from "@shared/types/see-and-write";
import type { WritingExerciseTopic } from "@shared/types/utils";
import { sanitizeImageSrc } from "@shared/lib/sanitize-image-src";
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

import {
	ADMIN_SAW_LIST_QUERY_KEY,
	adminSAWExerciseQueryKey,
} from "@admin/features/writing/methods/see-and-write/components/form-options";
import { SAWEditWordPoolTable } from "@admin/features/writing/methods/see-and-write/components/word-pool-section";
import {
	createEmptyEditableWord,
	toWordPayload,
	wordPoolToEditableWords,
	type SAWEditableWord,
} from "@admin/features/writing/methods/see-and-write/components/word-pool-utils";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const levelSection = baseFilterSections.find((s) => s.id === "level")!;
const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

const topicValues = topicSection.options.map((o) => o.id) as [
	WritingExerciseTopic,
	...WritingExerciseTopic[],
];

function getOptionLabel(
	section: (typeof baseFilterSections)[number],
	value: string,
) {
	return section.options.find((o) => o.id === value)?.label;
}

const sawEditFormSchema = z
	.object({
		title: z.string().trim().min(1, "Vui lòng nhập tiêu đề"),
		level: z.enum(["beginner", "intermediate", "advanced"]),
		topic: z.enum(topicValues),
		imageSource: z.enum(["upload", "url", "keep"]),
		imageUrl: z.string(),
		minWordCount: z
			.number()
			.int("Số từ tối thiểu phải là số nguyên")
			.positive("Số từ tối thiểu phải lớn hơn 0"),
		maxWordCount: z
			.number()
			.int("Số từ tối đa phải là số nguyên")
			.positive("Số từ tối đa phải lớn hơn 0"),
	})
	.superRefine((data, ctx) => {
		if (data.minWordCount > data.maxWordCount) {
			ctx.addIssue({
				code: "custom",
				message: "Số từ tối đa phải lớn hơn hoặc bằng số từ tối thiểu",
				path: ["maxWordCount"],
			});
		}
		if (data.imageSource === "url") {
			const url = data.imageUrl.trim();
			if (!url) {
				ctx.addIssue({
					code: "custom",
					message: "Vui lòng nhập URL ảnh",
					path: ["imageUrl"],
				});
				return;
			}
			const parsed = z.url("URL ảnh không hợp lệ").safeParse(url);
			if (!parsed.success) {
				ctx.addIssue({
					code: "custom",
					message: "URL ảnh không hợp lệ",
					path: ["imageUrl"],
				});
			}
		}
	});

type SAWEditFormValues = z.infer<typeof sawEditFormSchema>;

function exerciseToFormValues(exercise: SAWAdminExercise): SAWEditFormValues {
	return {
		title: exercise.title,
		level: exercise.level,
		topic: exercise.topic,
		imageSource: "keep",
		imageUrl: exercise.image,
		minWordCount: exercise.minWordCount,
		maxWordCount: exercise.maxWordCount,
	};
}

function getApiErrorMessage(error: unknown): string {
	if (isAxiosError(error)) {
		const msg = error.response?.data?.message;
		if (typeof msg === "string" && msg.trim()) return msg;
	}
	return "Không thể cập nhật bài tập. Vui lòng thử lại.";
}

type SAWEditDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	exerciseId: string;
};

type SAWEditFormProps = {
	exercise: SAWAdminExercise;
	exerciseId: string;
	onOpenChange: (open: boolean) => void;
};

function SAWEditForm({ exercise, exerciseId, onOpenChange }: SAWEditFormProps) {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [requiredWords, setRequiredWords] = useState<SAWEditableWord[]>(() =>
		wordPoolToEditableWords(exercise.wordPool.filter((w) => w.isRequired)),
	);
	const [distractorWords, setDistractorWords] = useState<SAWEditableWord[]>(
		() =>
			wordPoolToEditableWords(exercise.wordPool.filter((w) => !w.isRequired)),
	);
	const [requiredWordsError, setRequiredWordsError] = useState<string | null>(
		null,
	);

	const originalImage = exercise.image;

	const form = useForm<SAWEditFormValues>({
		resolver: zodResolver(sawEditFormSchema),
		defaultValues: exerciseToFormValues(exercise),
	});

	const imageSource = useWatch({ control: form.control, name: "imageSource" });
	const imageUrl = useWatch({ control: form.control, name: "imageUrl" });

	const resetImageFile = useCallback(() => {
		if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
		setImageFile(null);
		setImagePreview(null);
		setFileError(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, [imagePreview]);

	const updateMutation = useMutation({
		mutationFn: async (values: SAWEditFormValues) => {
			const payload: Parameters<typeof updateSAWExercise>[1] = {
				title: values.title.trim(),
				level: values.level,
				topic: values.topic,
				minWordCount: values.minWordCount,
				maxWordCount: values.maxWordCount,
			};

			if (values.imageSource === "upload" && imageFile) {
				const uploadRes = await uploadSAWImage(imageFile);
				payload.image = uploadRes.data.url;
			} else if (
				values.imageSource === "url" &&
				values.imageUrl.trim() !== originalImage
			) {
				payload.image = values.imageUrl.trim();
			}

			payload.requiredWords = toWordPayload(requiredWords);
			payload.distractorWords = toWordPayload(distractorWords);

			return updateSAWExercise(exerciseId, payload);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ADMIN_SAW_LIST_QUERY_KEY,
			});
			await queryClient.invalidateQueries({
				queryKey: adminSAWExerciseQueryKey(exerciseId),
			});
			toast.success("Cập nhật bài tập thành công");
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(getApiErrorMessage(error));
		},
	});

	const onImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		setFileError(null);
		if (!file) {
			resetImageFile();
			return;
		}
		if (!file.type.startsWith("image/")) {
			setFileError("Chỉ chấp nhận file ảnh");
			e.target.value = "";
			return;
		}
		if (file.size > MAX_IMAGE_BYTES) {
			setFileError("Kích thước ảnh tối đa 10MB");
			e.target.value = "";
			return;
		}
		if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
		setImageFile(file);
		setImagePreview(URL.createObjectURL(file));
	};

	const displayImage =
		imagePreview ?? (imageSource === "url" ? imageUrl : null) ?? originalImage;
	const safeDisplayImage = sanitizeImageSrc(displayImage);

	const onSubmit = form.handleSubmit((values) => {
		if (values.imageSource === "upload" && !imageFile) {
			setFileError("Vui lòng chọn ảnh để tải lên");
			return;
		}

		const requiredPayload = toWordPayload(requiredWords);
		if (requiredPayload.length === 0) {
			setRequiredWordsError("Vui lòng nhập ít nhất một từ khóa");
			return;
		}

		setFileError(null);
		setRequiredWordsError(null);
		updateMutation.mutate(values);
	});

	const updateRequiredWord = useCallback((index: number, word: string) => {
		setRequiredWords((prev) =>
			prev.map((entry, i) => (i === index ? { ...entry, word } : entry)),
		);
		setRequiredWordsError(null);
	}, []);

	const addRequiredWord = useCallback(() => {
		setRequiredWords((prev) => [...prev, createEmptyEditableWord()]);
	}, []);

	const removeRequiredWord = useCallback((index: number) => {
		setRequiredWords((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const updateDistractorWord = useCallback((index: number, word: string) => {
		setDistractorWords((prev) =>
			prev.map((entry, i) => (i === index ? { ...entry, word } : entry)),
		);
	}, []);

	const addDistractorWord = useCallback(() => {
		setDistractorWords((prev) => [...prev, createEmptyEditableWord()]);
	}, []);

	const removeDistractorWord = useCallback((index: number) => {
		setDistractorWords((prev) => prev.filter((_, i) => i !== index));
	}, []);

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

				<Field>
					<FieldLabel>Ảnh</FieldLabel>
					{safeDisplayImage && (
						<img
							src={safeDisplayImage}
							alt={exercise.title}
							className="mb-2 h-32 w-full rounded-lg border object-cover"
						/>
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant={imageSource === "keep" ? "default" : "outline"}
							size="sm"
							disabled={isPending}
							onClick={() => {
								form.setValue("imageSource", "keep");
								form.setValue("imageUrl", originalImage);
								resetImageFile();
								form.clearErrors("imageUrl");
							}}
						>
							Giữ ảnh hiện tại
						</Button>
						<Button
							type="button"
							variant={imageSource === "upload" ? "default" : "outline"}
							size="sm"
							disabled={isPending}
							onClick={() => {
								form.setValue("imageSource", "upload");
								form.clearErrors("imageUrl");
							}}
						>
							Tải lên
						</Button>
						<Button
							type="button"
							variant={imageSource === "url" ? "default" : "outline"}
							size="sm"
							disabled={isPending}
							onClick={() => {
								form.setValue("imageSource", "url");
								form.setValue("imageUrl", originalImage);
								setFileError(null);
							}}
						>
							Nhập URL
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						Định dạng ảnh, tối đa 10MB
					</p>

					{imageSource === "upload" && (
						<div className="flex flex-col gap-2">
							<Input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								disabled={isPending}
								onChange={onImageFileChange}
								aria-invalid={!!fileError}
							/>
							{fileError && (
								<p className="text-sm text-destructive">{fileError}</p>
							)}
						</div>
					)}

					{imageSource === "url" && (
						<Controller
							name="imageUrl"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<Input
										{...field}
										type="url"
										placeholder="https://..."
										disabled={isPending}
										aria-invalid={fieldState.invalid}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
					)}
				</Field>

				<SAWEditWordPoolTable
					label="Từ khóa mô tả hình ảnh"
					words={requiredWords}
					disabled={isPending}
					invalid={!!requiredWordsError}
					error={
						requiredWordsError ? { message: requiredWordsError } : undefined
					}
					onAdd={addRequiredWord}
					onUpdateWord={updateRequiredWord}
					onRemove={removeRequiredWord}
				/>

				<SAWEditWordPoolTable
					label="Từ khóa gây nhiễu"
					words={distractorWords}
					disabled={isPending}
					onAdd={addDistractorWord}
					onUpdateWord={updateDistractorWord}
					onRemove={removeDistractorWord}
				/>

				<div className="grid gap-4 sm:grid-cols-2">
					<Controller
						name="minWordCount"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>
									Số từ tối thiểu trong đoạn mô tả
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									min={1}
									value={field.value}
									disabled={isPending}
									aria-invalid={fieldState.invalid}
									onBlur={field.onBlur}
									onChange={(e) =>
										field.onChange(
											e.target.value === "" ? 0 : Number(e.target.value),
										)
									}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>

					<Controller
						name="maxWordCount"
						control={form.control}
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor={field.name}>
									Số từ tối đa trong đoạn mô tả
								</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									min={1}
									value={field.value}
									disabled={isPending}
									aria-invalid={fieldState.invalid}
									onBlur={field.onBlur}
									onChange={(e) =>
										field.onChange(
											e.target.value === "" ? 0 : Number(e.target.value),
										)
									}
								/>
								{fieldState.invalid && (
									<FieldError errors={[fieldState.error]} />
								)}
							</Field>
						)}
					/>
				</div>
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

export function SAWEditDialog({
	open,
	onOpenChange,
	exerciseId,
}: SAWEditDialogProps) {
	const {
		data: exerciseRes,
		isLoading,
		isError,
	} = useQuery({
		queryKey: adminSAWExerciseQueryKey(exerciseId),
		queryFn: () => fetchSAWAdminExercise(exerciseId),
		enabled: open && !!exerciseId,
	});

	const exercise = exerciseRes?.data;
	const showForm = !isLoading && !isError && !!exercise && !!exerciseId;

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
					<SAWEditForm
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
