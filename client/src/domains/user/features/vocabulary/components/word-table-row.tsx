import { memo, type ChangeEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	CircleIcon,
	Delete01Icon,
	Edit03Icon,
	PauseIcon,
	Tick02Icon,
	VolumeHighIcon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import type { Flashcard } from "@shared/types/vocab";
import { translatePartOfSpeech } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { TableCell, TableRow } from "@shared/components/ui/table";

import type { FlashcardTableStatus } from "@user/features/vocabulary/hooks/use-flashcards-by-status";

export type FlashcardRowDraft = {
	word: string;
	meaning: string;
	ipa: string;
	partOfSpeech: string;
	enExample: string;
};

type WordTableRowProps = {
	flashcard: Flashcard;
	tableStatus: FlashcardTableStatus;
	isEditing: boolean;
	draft: FlashcardRowDraft;
	isMutating: boolean;
	isPlayingThis: boolean;
	onDraftChange: (patch: Partial<FlashcardRowDraft>) => void;
	onStartEdit: () => void;
	onConfirmEdit: () => void;
	onToggleStatus: () => void;
	onDelete: () => void;
	onPlayAudio: () => void;
};

/**
 * Một hàng bảng từ — chế độ đọc hoặc sửa inline với các nút action dạng icon.
 */
export const WordTableRow = memo(function WordTableRow({
	flashcard,
	tableStatus,
	isEditing,
	draft,
	isMutating,
	isPlayingThis,
	onDraftChange,
	onStartEdit,
	onConfirmEdit,
	onToggleStatus,
	onDelete,
	onPlayAudio,
}: WordTableRowProps) {
	const targetStatus: FlashcardTableStatus =
		tableStatus === "unknown" ? "known" : "unknown";
	const statusTooltip = tableStatus === "unknown" ? "Thành thạo" : "Đang học";

	const handleInput =
		(field: keyof FlashcardRowDraft) =>
		(event: ChangeEvent<HTMLInputElement>) => {
			onDraftChange({ [field]: event.target.value });
		};

	return (
		<TableRow>
			<TableCell className="min-w-28">
				{isEditing ? (
					<Input
						value={draft.word}
						onChange={handleInput("word")}
						disabled={isMutating}
						className="h-8"
						aria-label="Từ"
					/>
				) : (
					flashcard.word
				)}
			</TableCell>
			<TableCell className="min-w-24">
				{isEditing ? (
					<Input
						value={draft.ipa}
						onChange={handleInput("ipa")}
						disabled={isMutating}
						className="h-8"
						aria-label="IPA"
					/>
				) : flashcard.ipa ? (
					`/${flashcard.ipa}/`
				) : (
					"—"
				)}
			</TableCell>
			<TableCell className="min-w-32">
				{isEditing ? (
					<Input
						value={draft.meaning}
						onChange={handleInput("meaning")}
						disabled={isMutating}
						className="h-8"
						aria-label="Nghĩa"
					/>
				) : (
					flashcard.meaning
				)}
			</TableCell>
			<TableCell className="min-w-28">
				{isEditing ? (
					<Input
						value={draft.partOfSpeech}
						onChange={handleInput("partOfSpeech")}
						disabled={isMutating}
						className="h-8"
						aria-label="Loại từ"
					/>
				) : flashcard.partOfSpeech ? (
					translatePartOfSpeech(flashcard.partOfSpeech)
				) : (
					"—"
				)}
			</TableCell>
			<TableCell
				className="max-w-xs truncate"
				title={flashcard.enExample ?? undefined}
			>
				{isEditing ? (
					<Input
						value={draft.enExample}
						onChange={handleInput("enExample")}
						disabled={isMutating}
						className="h-8"
						aria-label="Ví dụ"
					/>
				) : (
					flashcard.enExample || "—"
				)}
			</TableCell>
			<TableCell className="w-36">
				<div className="flex items-center gap-0.5">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								disabled={isMutating}
								aria-label={`Phát âm ${flashcard.word}`}
								onClick={onPlayAudio}
							>
								<HugeiconsIcon
									icon={isPlayingThis ? PauseIcon : VolumeHighIcon}
									className="size-4"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Phát âm</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								disabled={isMutating}
								aria-label={statusTooltip}
								onClick={onToggleStatus}
							>
								<HugeiconsIcon
									icon={
										targetStatus === "known"
											? CheckmarkCircle02Icon
											: CircleIcon
									}
									className={
										targetStatus === "known"
											? "size-4 text-green-800"
											: "size-4 text-orange-500"
									}
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{statusTooltip}</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								disabled={isMutating}
								aria-label={isEditing ? "Xác nhận" : "Sửa"}
								onClick={isEditing ? onConfirmEdit : onStartEdit}
							>
								<HugeiconsIcon
									icon={isEditing ? Tick02Icon : Edit03Icon}
									className="size-4"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{isEditing ? "Xác nhận" : "Sửa"}</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								disabled={isMutating}
								aria-label="Xóa"
								onClick={onDelete}
							>
								<HugeiconsIcon
									icon={Delete01Icon}
									className="size-4 text-destructive"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Xóa</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</TableCell>
		</TableRow>
	);
});
