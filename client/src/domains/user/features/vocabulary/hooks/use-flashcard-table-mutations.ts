import {
	useMutation,
	type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
	deleteFlashcard,
	updateFlashcard,
	updateFlashcardStatus,
} from "@shared/api/vocab";
import { queryClient } from "@shared/lib/query-client";
import type { APIResponse } from "@shared/types/utils";
import type { Flashcard } from "@shared/types/vocab";

import {
	flashcardTableQueryKey,
	type FlashcardTableStatus,
} from "@user/features/vocabulary/hooks/use-flashcards-by-status";

type TableInfiniteData = InfiniteData<APIResponse<Flashcard[]>>;

function removeCardFromCache(
	old: TableInfiniteData | undefined,
	cardId: string,
): TableInfiniteData | undefined {
	if (!old) return old;

	let removed = false;
	const pages = old.pages.map((page, pageIndex) => {
		const filtered = page.data.filter((card) => card._id !== cardId);
		if (filtered.length !== page.data.length) removed = true;
		return {
			...page,
			data: filtered,
			pagination:
				pageIndex === 0 && page.pagination
					? {
							...page.pagination,
							total: Math.max(0, page.pagination.total - 1),
						}
					: page.pagination,
		};
	});

	return removed ? { ...old, pages } : old;
}

function patchCardInCache(
	old: TableInfiniteData | undefined,
	cardId: string,
	patch: Partial<Flashcard>,
): TableInfiniteData | undefined {
	if (!old) return old;

	const pages = old.pages.map((page) => ({
		...page,
		data: page.data.map((card) =>
			card._id === cardId ? { ...card, ...patch } : card,
		),
	}));

	return { ...old, pages };
}

function invalidateCarouselLists(deckId: string) {
	void queryClient.invalidateQueries({
		queryKey: ["flashcards", "list", deckId],
	});
}

/**
 * Mutations cho bảng từ: đổi trạng thái, sửa inline, xóa — đồng bộ cache bảng và carousel.
 * @param deckId — id học phần
 * @param status — trạng thái bảng hiện tại (known | unknown)
 */
export function useFlashcardTableMutations(
	deckId: string,
	status: FlashcardTableStatus,
) {
	const queryKey = flashcardTableQueryKey(deckId, status);
	const oppositeStatus: FlashcardTableStatus =
		status === "known" ? "unknown" : "known";

	const statusMutation = useMutation({
		mutationFn: ({
			cardId,
			newStatus,
		}: {
			cardId: string;
			newStatus: FlashcardTableStatus;
		}) => updateFlashcardStatus(cardId, { status: newStatus }),
		onMutate: async ({ cardId }) => {
			await queryClient.cancelQueries({ queryKey });
			const previous =
				queryClient.getQueryData<TableInfiniteData>(queryKey);
			queryClient.setQueryData<TableInfiniteData>(queryKey, (old) =>
				removeCardFromCache(old, cardId),
			);
			return { previous };
		},
		onSuccess: () => {
			toast.success(
				status === "unknown"
					? "Đã chuyển từ sang thành thạo"
					: "Đã chuyển từ sang đang học",
			);
			void queryClient.invalidateQueries({
				queryKey: flashcardTableQueryKey(deckId, oppositeStatus),
			});
			invalidateCarouselLists(deckId);
		},
		onError: (_error, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
			toast.error("Không thể cập nhật trạng thái");
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({
			cardId,
			payload,
		}: {
			cardId: string;
			payload: {
				word: string;
				meaning: string;
				ipa?: string;
				partOfSpeech?: string;
				enExample?: string;
			};
		}) => updateFlashcard(cardId, payload),
		onMutate: async ({ cardId, payload }) => {
			await queryClient.cancelQueries({ queryKey });
			const previous =
				queryClient.getQueryData<TableInfiniteData>(queryKey);
			queryClient.setQueryData<TableInfiniteData>(queryKey, (old) =>
				patchCardInCache(old, cardId, payload),
			);
			return { previous };
		},
		onSuccess: () => {
			toast.success("Đã cập nhật từ");
			invalidateCarouselLists(deckId);
		},
		onError: (_error, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
			toast.error("Không thể cập nhật từ");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (cardId: string) => deleteFlashcard(cardId),
		onMutate: async (cardId) => {
			await queryClient.cancelQueries({ queryKey });
			const previous =
				queryClient.getQueryData<TableInfiniteData>(queryKey);
			queryClient.setQueryData<TableInfiniteData>(queryKey, (old) =>
				removeCardFromCache(old, cardId),
			);
			return { previous };
		},
		onSuccess: () => {
			toast.success("Đã xóa từ");
			invalidateCarouselLists(deckId);
		},
		onError: (_error, _cardId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
			toast.error("Không thể xóa từ");
		},
	});

	const isMutating =
		statusMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending;

	return {
		statusMutation,
		updateMutation,
		deleteMutation,
		isMutating,
	};
}
