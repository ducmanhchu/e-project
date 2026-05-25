import { useMemo } from "react";
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
import { Textarea } from "@shared/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@shared/components/ui/table";
import { toast } from "sonner";

import {
	ADMIN_PARAPHRASE_LIST_QUERY_KEY,
	adminParaphraseExerciseQueryKey,
} from "@admin/features/writing/methods/paraphrase/components/form-options";
import {
	buildSentencesPayload,
	exerciseToFormValues,
	getApiErrorMessage,
	paraphraseEditFormSchema,
	type ParaphraseEditFormValues,
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

	const sortedSentences = useMemo(
		() => [...exercise.sentences].sort((a, b) => a.order - b.order),
		[exercise.sentences],
	);

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
			};

			if (values.sentencesRaw.trim()) {
				payload.sentences = buildSentencesPayload(values.sentencesRaw);
			}

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

	const onSubmit = form.handleSubmit((values) => {
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

				<Field>
					<FieldLabel>Các câu hỏi hiện tại</FieldLabel>
					<div className="rounded-lg border max-h-48 overflow-y-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-16">STT</TableHead>
									<TableHead>Câu hỏi</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedSentences.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={2}
											className="text-center text-muted-foreground"
										>
											Chưa có câu hỏi
										</TableCell>
									</TableRow>
								) : (
									sortedSentences.map((sentence) => (
										<TableRow key={sentence.order}>
											<TableCell className="tabular-nums text-muted-foreground">
												{sentence.order}
											</TableCell>
											<TableCell>{sentence.targetSentence}</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</Field>

				<Controller
					name="sentencesRaw"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Cập nhật các câu hỏi</FieldLabel>
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
								Nhập các câu hỏi mới, ngăn cách bởi dấu chấm phẩy (;). Toàn bộ
								danh sách câu hỏi sẽ được ghi đè khi bạn nhập nội dung tại đây.
							</p>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
					Lưu thay đổi
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
				className="sm:max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
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
