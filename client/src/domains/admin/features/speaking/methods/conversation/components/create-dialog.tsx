import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";

import { createAdminConversation } from "@shared/api/conversation";
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
import { Textarea } from "@shared/components/ui/textarea";
import { toast } from "sonner";

import { ConversationMessagesEditor } from "@admin/features/speaking/methods/conversation/components/messages-editor";
import { ConversationSlangTable } from "@admin/features/speaking/methods/conversation/components/slang-table";
import { ConversationSpeakerFields } from "@admin/features/speaking/methods/conversation/components/speaker-fields";
import { ADMIN_CONVERSATION_LIST_QUERY_KEY } from "@admin/features/speaking/methods/conversation/components/form-options";
import {
	appendMessage,
	conversationCreateDefaultValues,
	conversationCreateFormSchema,
	createEmptySlang,
	createInitialMessages,
	createInitialSlang,
	getApiErrorMessage,
	toConversationPayload,
	validateMessages,
	validateSlangRows,
	type ConversationCreateFormValues,
	type EditableMessage,
	type EditableSlang,
} from "@admin/features/speaking/methods/conversation/components/conversation-form-utils";

const levelSection = baseFilterSections.find((s) => s.id === "level")!;
const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

type ConversationCreateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ConversationCreateDialog({
	open,
	onOpenChange,
}: ConversationCreateDialogProps) {
	const queryClient = useQueryClient();
	const [messages, setMessages] = useState<EditableMessage[]>(
		createInitialMessages,
	);
	const [slangRows, setSlangRows] =
		useState<EditableSlang[]>(createInitialSlang);
	const [messagesError, setMessagesError] = useState<string | null>(null);
	const [slangError, setSlangError] = useState<string | null>(null);

	const form = useForm<ConversationCreateFormValues>({
		resolver: zodResolver(conversationCreateFormSchema),
		defaultValues: conversationCreateDefaultValues,
	});

	const resetAll = useCallback(() => {
		form.reset(conversationCreateDefaultValues);
		setMessages(createInitialMessages());
		setSlangRows(createInitialSlang());
		setMessagesError(null);
		setSlangError(null);
	}, [form]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) resetAll();
			onOpenChange(nextOpen);
		},
		[onOpenChange, resetAll],
	);

	const createMutation = useMutation({
		mutationFn: (values: ConversationCreateFormValues) =>
			createAdminConversation(
				toConversationPayload(values, messages, slangRows),
			),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ADMIN_CONVERSATION_LIST_QUERY_KEY,
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
		createMutation.mutate(values);
	});

	const isPending = createMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				showCloseButton
				className="sm:max-w-5xl max-h-[90vh] overflow-y-auto no-scrollbar"
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
							name="scenario"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={field.name}>Bối cảnh</FieldLabel>
									<Textarea
										{...field}
										id={field.name}
										placeholder="Mô tả bối cảnh hội thoại"
										disabled={isPending}
										rows={3}
										aria-invalid={fieldState.invalid}
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
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
