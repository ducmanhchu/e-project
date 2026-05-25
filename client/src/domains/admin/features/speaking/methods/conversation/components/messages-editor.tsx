import { memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@shared/lib/utils";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@shared/components/ui/field";
import { Textarea } from "@shared/components/ui/textarea";

import {
	CONVERSATION_MAX_MESSAGES,
	CONVERSATION_MAX_MESSAGE_LENGTH,
	speakerKeyForIndex,
	type EditableMessage,
} from "@admin/features/speaking/methods/conversation/components/conversation-form-utils";

type MessageCellProps = {
	index: number;
	message: EditableMessage;
	disabled: boolean;
	canRemove: boolean;
	onUpdateText: (index: number, text: string) => void;
	onRemove: (index: number) => void;
};

const MessageCell = memo(function MessageCell({
	index,
	message,
	disabled,
	canRemove,
	onUpdateText,
	onRemove,
}: MessageCellProps) {
	const speakerKey = speakerKeyForIndex(index);

	return (
		<div className="flex flex-col gap-2 rounded-md border p-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<FieldLabel className="mb-0">Lời thoại {index + 1}</FieldLabel>
					<Badge
						variant="outline"
						className="font-normal text-muted-foreground"
					>
						{speakerKey}
					</Badge>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={disabled || !canRemove}
					onClick={() => onRemove(index)}
					aria-label={`Xóa lời thoại ${index + 1}`}
				>
					<HugeiconsIcon icon={Delete01Icon} className="size-4" />
				</Button>
			</div>
			<Textarea
				value={message.text}
				onChange={(e) => onUpdateText(index, e.target.value)}
				disabled={disabled}
				maxLength={CONVERSATION_MAX_MESSAGE_LENGTH}
				placeholder="Nhập nội dung lời thoại"
				rows={2}
				className="min-h-16 resize-y"
				aria-label={`Lời thoại ${index + 1}`}
			/>
		</div>
	);
});

type ConversationMessagesEditorProps = {
	messages: EditableMessage[];
	disabled?: boolean;
	invalid?: boolean;
	error?: { message?: string };
	onAdd: () => void;
	onUpdateText: (index: number, text: string) => void;
	onRemove: (index: number) => void;
};

/** Danh sách lời thoại — thêm từng dòng, luân phiên speaker A/B */
export const ConversationMessagesEditor = memo(
	function ConversationMessagesEditor({
		messages,
		disabled,
		invalid,
		error,
		onAdd,
		onUpdateText,
		onRemove,
	}: ConversationMessagesEditorProps) {
		const canAdd = messages.length < CONVERSATION_MAX_MESSAGES;

		return (
			<Field
				data-invalid={invalid}
				className={cn(invalid && "text-destructive")}
			>
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<FieldLabel>Lời thoại</FieldLabel>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={disabled || !canAdd}
							onClick={onAdd}
						>
							<HugeiconsIcon icon={Add01Icon} className="size-4" />
							Thêm
						</Button>
					</div>

					<div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
						{messages.map((message, index) => (
							<MessageCell
								key={message._key}
								index={index}
								message={message}
								disabled={!!disabled}
								canRemove={messages.length > 2}
								onUpdateText={onUpdateText}
								onRemove={onRemove}
							/>
						))}
					</div>
				</div>

				{invalid && error && <FieldError errors={[error]} />}
			</Field>
		);
	},
);
