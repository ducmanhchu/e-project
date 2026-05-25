import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import * as z from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";

import { createSAWExercise, uploadSAWImage } from "@shared/api/see-and-write";
import type { ExerciseLevel, WritingExerciseTopic } from "@shared/types/utils";
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

import { ADMIN_SAW_LIST_QUERY_KEY } from "@admin/features/writing/methods/see-and-write/components/form-options";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const levelSection = baseFilterSections.find((s) => s.id === "level")!;
const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

const topicValues = topicSection.options.map((o) => o.id) as [
	WritingExerciseTopic,
	...WritingExerciseTopic[],
];

const WORD_COUNT_BY_LEVEL: Record<ExerciseLevel, { min: number; max: number }> =
	{
		beginner: { min: 30, max: 100 },
		intermediate: { min: 40, max: 150 },
		advanced: { min: 50, max: 200 },
	};

function parseCommaKeywords(raw: string): string[] {
	return raw
		.split(",")
		.map((k) => k.trim())
		.filter(Boolean);
}

const sawCreateFormSchema = z
	.object({
		title: z.string().trim().min(1, "Vui lòng nhập tiêu đề"),
		level: z.enum(["beginner", "intermediate", "advanced"]),
		topic: z.enum(topicValues),
		imageSource: z.enum(["upload", "url"]),
		imageUrl: z.string(),
		requiredKeywords: z
			.string()
			.trim()
			.min(1, "Vui lòng nhập ít nhất một từ khóa"),
		distractorKeywords: z.string(),
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
		const required = parseCommaKeywords(data.requiredKeywords);
		if (required.length === 0) {
			ctx.addIssue({
				code: "custom",
				message: "Vui lòng nhập ít nhất một từ khóa",
				path: ["requiredKeywords"],
			});
		}
	});

type SAWCreateFormValues = z.infer<typeof sawCreateFormSchema>;

const defaultValues: SAWCreateFormValues = {
	title: "",
	level: "beginner",
	topic: "personal_communication",
	imageSource: "upload",
	imageUrl: "",
	requiredKeywords: "",
	distractorKeywords: "",
	minWordCount: WORD_COUNT_BY_LEVEL.beginner.min,
	maxWordCount: WORD_COUNT_BY_LEVEL.beginner.max,
};

function getApiErrorMessage(error: unknown): string {
	if (isAxiosError(error)) {
		const msg = error.response?.data?.message;
		if (typeof msg === "string" && msg.trim()) return msg;
	}
	return "Không thể tạo bài tập. Vui lòng thử lại.";
}

type SAWCreateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function SAWCreateDialog({ open, onOpenChange }: SAWCreateDialogProps) {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);

	const form = useForm<SAWCreateFormValues>({
		resolver: zodResolver(sawCreateFormSchema),
		defaultValues,
	});

	const imageSource = form.watch("imageSource");
	const level = form.watch("level");

	useEffect(() => {
		const wc = WORD_COUNT_BY_LEVEL[level];
		form.setValue("minWordCount", wc.min);
		form.setValue("maxWordCount", wc.max);
	}, [level, form]);

	const resetImageFile = useCallback(() => {
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		setImageFile(null);
		setImagePreview(null);
		setFileError(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, [imagePreview]);

	const resetAll = useCallback(() => {
		form.reset(defaultValues);
		resetImageFile();
	}, [form, resetImageFile]);

	useEffect(() => {
		if (!open) resetAll();
	}, [open, resetAll]);

	const createMutation = useMutation({
		mutationFn: async (values: SAWCreateFormValues) => {
			let image = values.imageUrl.trim();

			if (values.imageSource === "upload") {
				if (!imageFile) {
					throw new Error("FILE_REQUIRED");
				}
				const uploadRes = await uploadSAWImage(imageFile);
				image = uploadRes.data.url;
			}

			return createSAWExercise({
				title: values.title.trim(),
				level: values.level,
				topic: values.topic,
				image,
				requiredWords: parseCommaKeywords(values.requiredKeywords),
				distractorWords: parseCommaKeywords(values.distractorKeywords),
				minWordCount: values.minWordCount,
				maxWordCount: values.maxWordCount,
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ADMIN_SAW_LIST_QUERY_KEY,
			});
			toast.success("Tạo bài tập thành công");
			onOpenChange(false);
		},
		onError: (error) => {
			if (error instanceof Error && error.message === "FILE_REQUIRED") {
				setFileError("Vui lòng chọn ảnh để tải lên");
				return;
			}
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
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		setImageFile(file);
		setImagePreview(URL.createObjectURL(file));
	};

	const onSubmit = form.handleSubmit((values) => {
		if (values.imageSource === "upload" && !imageFile) {
			setFileError("Vui lòng chọn ảnh để tải lên");
			return;
		}
		setFileError(null);
		createMutation.mutate(values);
	});

	const isPending = createMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton
				className="sm:max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar"
				aria-describedby={undefined}
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

						<Field>
							<FieldLabel>Ảnh</FieldLabel>
							<div className="flex gap-2">
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
										setFileError(null);
									}}
								>
									Nhập URL
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								Định dạng ảnh, tối đa 10MB
							</p>

							{imageSource === "upload" ? (
								<div className="flex flex-col gap-2">
									<Input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										disabled={isPending}
										onChange={onImageFileChange}
										aria-invalid={!!fileError}
									/>
									{imagePreview && (
										<img
											src={imagePreview}
											alt="Xem trước"
											className="h-32 w-full rounded-lg border object-cover"
										/>
									)}
									{fileError && (
										<p className="text-sm text-destructive">{fileError}</p>
									)}
								</div>
							) : (
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

						<Controller
							name="requiredKeywords"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={field.name}>
										Từ khóa mô tả hình ảnh
									</FieldLabel>
									<Input
										{...field}
										id={field.name}
										placeholder="book, mother, child"
										disabled={isPending}
										aria-invalid={fieldState.invalid}
									/>
									<p className="text-xs text-muted-foreground">
										Nhập các từ khóa, ngăn cách bởi dấu phẩy
									</p>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>

						<Controller
							name="distractorKeywords"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={field.name}>
										Từ khóa gây nhiễu
									</FieldLabel>
									<Input
										{...field}
										id={field.name}
										placeholder="helicopter, harbor, vineyard"
										disabled={isPending}
										aria-invalid={fieldState.invalid}
									/>
									<p className="text-xs text-muted-foreground">
										Nhập các từ khóa, ngăn cách bởi dấu phẩy
									</p>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
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
							Tạo bài tập
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
