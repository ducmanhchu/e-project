import { memo, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@shared/components/ui/field";
import { Input } from "@shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@shared/components/ui/table";

import type { EditableSlang } from "@admin/features/speaking/methods/conversation/components/conversation-form-utils";

type SlangRowProps = {
	row: EditableSlang;
	index: number;
	messageCount: number;
	disabled: boolean;
	onUpdate: (
		index: number,
		patch: Partial<Pick<EditableSlang, "messageIndex" | "term" | "meaning">>,
	) => void;
	onRemove: (index: number) => void;
};

const SlangRow = memo(function SlangRow({
	row,
	index,
	messageCount,
	disabled,
	onUpdate,
	onRemove,
}: SlangRowProps) {
	const messageOptions = useMemo(
		() =>
			Array.from({ length: messageCount }, (_, i) => ({
				value: String(i),
				label: `Lời thoại ${i + 1}`,
			})),
		[messageCount],
	);

	return (
		<TableRow>
			<TableCell className="min-w-36">
				<Select
					value={String(row.messageIndex)}
					onValueChange={(v) =>
						onUpdate(index, { messageIndex: Number.parseInt(v, 10) })
					}
					disabled={disabled || messageCount === 0}
				>
					<SelectTrigger className="h-8 w-full">
						<SelectValue placeholder="Chọn lời thoại" />
					</SelectTrigger>
					<SelectContent>
						{messageOptions.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</TableCell>
			<TableCell>
				<Input
					value={row.term}
					onChange={(e) => onUpdate(index, { term: e.target.value })}
					disabled={disabled}
					className="h-8"
					placeholder="Từ"
					aria-label={`Cụm từ ${index + 1} — từ`}
				/>
			</TableCell>
			<TableCell>
				<Input
					value={row.meaning}
					onChange={(e) => onUpdate(index, { meaning: e.target.value })}
					disabled={disabled}
					className="h-8"
					placeholder="Nghĩa"
					aria-label={`Cụm từ ${index + 1} — nghĩa`}
				/>
			</TableCell>
			<TableCell className="w-12">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					disabled={disabled}
					onClick={() => onRemove(index)}
					aria-label={`Xóa cụm từ ${index + 1}`}
				>
					<HugeiconsIcon icon={Delete01Icon} className="size-4" />
				</Button>
			</TableCell>
		</TableRow>
	);
});

type ConversationSlangTableProps = {
	rows: EditableSlang[];
	messageCount: number;
	disabled?: boolean;
	invalid?: boolean;
	error?: { message?: string };
	onAdd: () => void;
	onUpdate: (
		index: number,
		patch: Partial<Pick<EditableSlang, "messageIndex" | "term" | "meaning">>,
	) => void;
	onRemove: (index: number) => void;
};

/** Bảng cụm từ slang gắn theo lời thoại */
export const ConversationSlangTable = memo(function ConversationSlangTable({
	rows,
	messageCount,
	disabled,
	invalid,
	error,
	onAdd,
	onUpdate,
	onRemove,
}: ConversationSlangTableProps) {
	return (
		<Field data-invalid={invalid}>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<FieldLabel>Cụm từ</FieldLabel>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={disabled}
						onClick={onAdd}
					>
						<HugeiconsIcon icon={Add01Icon} className="size-4" />
						Thêm
					</Button>
				</div>

				<div
					className="rounded-md border max-h-56 overflow-auto"
					style={{ contentVisibility: "auto" }}
				>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="min-w-36">Thuộc lời thoại</TableHead>
								<TableHead>Từ</TableHead>
								<TableHead>Nghĩa</TableHead>
								<TableHead className="w-12" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row, index) => (
								<SlangRow
									key={row._key}
									row={row}
									index={index}
									messageCount={messageCount}
									disabled={!!disabled}
									onUpdate={onUpdate}
									onRemove={onRemove}
								/>
							))}
						</TableBody>
					</Table>
				</div>
			</div>

			{invalid && error && <FieldError errors={[error]} />}
		</Field>
	);
});
