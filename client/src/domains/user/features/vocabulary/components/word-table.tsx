import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";

import type { Flashcard } from "@shared/types/vocab";
import { useAzureTTS } from "@shared/hooks/use-azure-tts";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@shared/components/ui/table";

import {
	useFlashcardsByStatus,
	type FlashcardTableStatus,
} from "@user/features/vocabulary/hooks/use-flashcards-by-status";
import { useFlashcardTableMutations } from "@user/features/vocabulary/hooks/use-flashcard-table-mutations";
import {
	WordTableRow,
	type FlashcardRowDraft,
} from "@user/features/vocabulary/components/word-table-row";
import { cn } from "@shared/lib/utils";

const TABLE_COLUMNS = ["Từ", "IPA", "Nghĩa", "Loại từ", "Ví dụ", ""] as const;

const SKELETON_ROW_COUNT = 3;

function toDraft(flashcard: Flashcard): FlashcardRowDraft {
	return {
		word: flashcard.word,
		meaning: flashcard.meaning,
		ipa: flashcard.ipa ?? "",
		partOfSpeech: flashcard.partOfSpeech ?? "",
		enExample: flashcard.enExample ?? "",
	};
}

type WordTableProps = {
	deckId: string;
	status: FlashcardTableStatus;
	title: string;
};

/**
 * Bảng danh sách từ theo trạng thái — ẩn hoàn toàn khi không có dữ liệu.
 * @param props.deckId — id học phần
 * @param props.status — known | unknown
 * @param props.title — tiêu đề section
 * @returns JSX.Element hoặc null khi bảng trống
 */
export function WordTable({ deckId, status, title }: WordTableProps) {
	const {
		cards,
		total,
		isLoading,
		isSuccess,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
	} = useFlashcardsByStatus(deckId, status);

	const { statusMutation, updateMutation, deleteMutation, isMutating } =
		useFlashcardTableMutations(deckId, status);

	const { isPlaying, toggle, stop } = useAzureTTS();
	const [playingCardId, setPlayingCardId] = useState<string | null>(null);
	const [editingCardId, setEditingCardId] = useState<string | null>(null);
	const [draft, setDraft] = useState<FlashcardRowDraft | null>(null);

	useEffect(() => {
		// eslint-disable-next-line
		if (!isPlaying) setPlayingCardId(null);
	}, [isPlaying]);

	const handlePlayAudio = useCallback(
		(cardId: string, word: string) => {
			if (playingCardId === cardId && isPlaying) {
				stop();
				setPlayingCardId(null);
				return;
			}
			setPlayingCardId(cardId);
			void toggle(word);
		},
		[playingCardId, isPlaying, stop, toggle],
	);

	const handleStartEdit = useCallback((flashcard: Flashcard) => {
		setEditingCardId(flashcard._id as string);
		setDraft(toDraft(flashcard));
	}, []);

	const handleDraftChange = useCallback((patch: Partial<FlashcardRowDraft>) => {
		setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
	}, []);

	const handleConfirmEdit = useCallback(
		(flashcard: Flashcard) => {
			if (!draft) return;

			const word = draft.word.trim();
			const meaning = draft.meaning.trim();
			if (!word || !meaning) return;

			const payload = {
				word,
				meaning,
				ipa: draft.ipa.trim() || undefined,
				partOfSpeech: draft.partOfSpeech.trim() || undefined,
				enExample: draft.enExample.trim() || undefined,
			};

			void updateMutation
				.mutateAsync({ cardId: flashcard._id as string, payload })
				.then(() => {
					setEditingCardId(null);
					setDraft(null);
				});
		},
		[draft, updateMutation],
	);

	const handleToggleStatus = useCallback(
		(flashcard: Flashcard) => {
			const newStatus: FlashcardTableStatus =
				status === "unknown" ? "known" : "unknown";
			if (editingCardId === flashcard._id) {
				setEditingCardId(null);
				setDraft(null);
			}
			void statusMutation.mutateAsync({
				cardId: flashcard._id as string,
				newStatus,
			});
		},
		[status, statusMutation, editingCardId],
	);

	const handleDelete = useCallback(
		(flashcard: Flashcard) => {
			if (editingCardId === flashcard._id) {
				setEditingCardId(null);
				setDraft(null);
			}
			void deleteMutation.mutateAsync(flashcard._id as string);
		},
		[deleteMutation, editingCardId],
	);

	if (isLoading) {
		return (
			<div className="flex flex-col gap-3">
				<p className="text-base font-semibold">{title}</p>
				<div className="space-y-2">
					{Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
						<Skeleton key={index} className="h-10 w-full" />
					))}
				</div>
			</div>
		);
	}

	if (isSuccess && total === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-1.5">
				<HugeiconsIcon
					icon={status === "known" ? CheckmarkCircle02Icon : CircleIcon}
					className={cn(
						"size-4",
						status === "known" ? "text-green-800" : "text-orange-600",
					)}
				/>
				<p
					className={cn(
						"text-base font-semibold",
						status === "known" ? "text-green-800" : "text-orange-600",
					)}
				>
					{title}
				</p>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						{TABLE_COLUMNS.map((label) => (
							<TableHead key={label || "actions"}>{label}</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{cards.map((flashcard) => {
						const isEditing = editingCardId === flashcard._id;
						return (
							<WordTableRow
								key={flashcard._id}
								flashcard={flashcard}
								tableStatus={status}
								isEditing={isEditing}
								draft={isEditing && draft ? draft : toDraft(flashcard)}
								isMutating={isMutating}
								isPlayingThis={playingCardId === flashcard._id && isPlaying}
								onDraftChange={handleDraftChange}
								onStartEdit={() => handleStartEdit(flashcard)}
								onConfirmEdit={() => handleConfirmEdit(flashcard)}
								onToggleStatus={() => handleToggleStatus(flashcard)}
								onDelete={() => handleDelete(flashcard)}
								onPlayAudio={() =>
									handlePlayAudio(flashcard._id as string, flashcard.word)
								}
							/>
						);
					})}
				</TableBody>
			</Table>

			{hasNextPage ? (
				<Button
					type="button"
					variant="outline"
					className="self-center"
					disabled={isFetchingNextPage}
					onClick={() => void fetchNextPage()}
				>
					{isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
				</Button>
			) : null}
		</div>
	);
}
