import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";

import {
	fetchAdminConversation,
	updateAdminConversation,
} from "@shared/api/conversation";
import type { AdminConversationDetail } from "@shared/types/conversation";
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
import { Textarea } from "@shared/components/ui/textarea";
import { toast } from "sonner";

import { ConversationMessagesEditor } from "@admin/features/speaking/methods/conversation/components/messages-editor";
import { ConversationSlangTable } from "@admin/features/speaking/methods/conversation/components/slang-table";
import { ConversationSpeakerFields } from "@admin/features/speaking/methods/conversation/components/speaker-fields";
import {
	ADMIN_CONVERSATION_LIST_QUERY_KEY,
	adminConversationExerciseQueryKey,
} from "@admin/features/speaking/methods/conversation/components/form-options";
import {
	appendMessage,
	conversationEditFormSchema,
	createEmptySlang,
	exerciseToEditableMessages,
	exerciseToEditableSlang,
	exerciseToFormValues,
	getApiErrorMessage,
	toConversationPayload,
	validateMessages,
	validateSlangRows,
	type ConversationEditFormValues,
	type EditableMessage,
	type EditableSlang,
} from "@admin/features/speaking/methods/conversation/components/conversation-form-utils";

const levelSection = baseFilterSections.find((s) => s.id === "level")!;
const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

function getOptionLabel(
	section: (typeof baseFilterSections)[number],
	value: string,
) {
	return section.options.find((o) => o.id === value)?.label;
}

type ConversationEditDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	exerciseId: string;
};

type ConversationEditFormProps = {
	detail: AdminConversationDetail;
	exerciseId: string;
	onOpenChange: (open: boolean) => void;
};

function ConversationEditForm({
	detail,
	exerciseId,
	onOpenChange,
}: ConversationEditFormProps) {
	const queryClient = useQueryClient();
	const [messages, setMessages] = useState<EditableMessage[]>(() =>
		exerciseToEditableMessages(detail),
	);
	const [slangRows, setSlangRows] = useState<EditableSlang[]>(() =>
		exerciseToEditableSlang(detail),
	);
	const [messagesError, setMessagesError] = useState<string | null>(null);
	const [slangError, setSlangError] = useState<string | null>(null);

	const form = useForm<ConversationEditFormValues>({
		resolver: zodResolver(conversationEditFormSchema),
		defaultValues: exerciseToFormValues(detail),
	});

	const updateMutation = useMutation({
		mutationFn: (values: ConversationEditFormValues) =>
			updateAdminConversation(
				exerciseId,
				toConversationPayload(values, messages, slangRows),
			),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ADMIN_CONVERSATION_LIST_QUERY_KEY,
			});
			await queryClient.invalidateQueries({
				queryKey: adminConversationExerciseQueryKey(exerciseId),
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

	const addMessages = useCallback(() => {
		setMessages((prev) => appendMessage(prev));
		setMessagesError(null);
	}, []);

	const updateMessageText = useCallback((index: number, text: string) => {
		setMessages((prev) =>
			prev.map((msg, i) => (i === index ? { ...msg, text } : msg)),
		);
		setMessagesError(null);
	}, []);

	const removeMessage = useCallback((index: number) => {
		setMessages((prev) => {
			const next = prev.filter((_, i) => i !== index);
			setSlangRows((slang) =>
				slang.map((row) => ({
					...row,
					messageIndex: Math.min(
						row.messageIndex,
						Math.max(0, next.length - 1),
					),
				})),
			);
			return next;
		});
		setMessagesError(null);
	}, []);

	const addSlang = useCallback(() => {
		setSlangRows((prev) => [...prev, createEmptySlang(messages.length)]);
		setSlangError(null);
	}, [messages.length]);

	const updateSlang = useCallback(
		(
			index: number,
			patch: Partial<Pick<EditableSlang, "messageIndex" | "term" | "meaning">>,
		) => {
			setSlangRows((prev) =>
				prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
			);
			setSlangError(null);
		},
		[],
	);

	const removeSlang = useCallback((index: number) => {
		setSlangRows((prev) => prev.filter((_, i) => i !== index));
		setSlangError(null);
	}, []);

	const onSubmit = form.handleSubmit((values) => {
		const msgErr = validateMessages(messages);
		if (msgErr) {
			setMessagesError(msgErr);
			return;
		}
		const slangErr = validateSlangRows(slangRows, messages.length);
		if (slangErr) {
			setSlangError(slangErr);
			return;
		}

		setMessagesError(null);
		setSlangError(null);
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

				<Controller
					name="scenario"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor={field.name}>Bối cảnh</FieldLabel>
							<Textarea
								{...field}
								id={field.name}
								disabled={isPending}
								rows={3}
								aria-invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<ConversationSpeakerFields
					control={form.control}
					errors={form.formState.errors}
					disabled={isPending}
				/>

				<ConversationMessagesEditor
					messages={messages}
					disabled={isPending}
					invalid={!!messagesError}
					error={messagesError ? { message: messagesError } : undefined}
					onAdd={addMessages}
					onUpdateText={updateMessageText}
					onRemove={removeMessage}
				/>

				<ConversationSlangTable
					rows={slangRows}
					messageCount={messages.length}
					disabled={isPending}
					invalid={!!slangError}
					error={slangError ? { message: slangError } : undefined}
					onAdd={addSlang}
					onUpdate={updateSlang}
					onRemove={removeSlang}
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

export function ConversationEditDialog({
	open,
	onOpenChange,
	exerciseId,
}: ConversationEditDialogProps) {
	const {
		data: detailRes,
		isLoading,
		isError,
	} = useQuery({
		queryKey: adminConversationExerciseQueryKey(exerciseId),
		queryFn: () => fetchAdminConversation(exerciseId),
		enabled: open && !!exerciseId,
	});

	const detail = detailRes?.data;
	const showForm = !isLoading && !isError && !!detail;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton
				className="sm:max-w-5xl max-h-[90vh] overflow-y-auto no-scrollbar"
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
					<ConversationEditForm
						key={exerciseId}
						detail={detail}
						exerciseId={exerciseId}
						onOpenChange={onOpenChange}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
