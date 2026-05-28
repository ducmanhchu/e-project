import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchFlashcardList } from "@shared/api/vocab";
import type { Flashcard } from "@shared/types/vocab";

import {
	FLASHCARD_PAGE_SIZE,
	FLASHCARD_TABLE_QUERY_KEY,
} from "@user/features/vocabulary/utils/constants";
import { getNextPageParam } from "@user/features/vocabulary/utils/helpers";

export type FlashcardTableStatus = Flashcard["status"];

/**
 * Query key bảng flashcard theo deck và trạng thái.
 * @param deckId — id học phần
 * @param status — known | unknown
 */
export function flashcardTableQueryKey(
	deckId: string,
	status: FlashcardTableStatus,
) {
	return ["flashcards", FLASHCARD_TABLE_QUERY_KEY, deckId, status] as const;
}

/**
 * Infinite query danh sách thẻ theo trạng thái — dùng cho bảng từ (độc lập carousel).
 * @param deckId — id học phần; bỏ qua fetch khi undefined
 * @param status — known | unknown
 * @returns cards đã flatten, total và trạng thái query
 */
export function useFlashcardsByStatus(
	deckId: string | undefined,
	status: FlashcardTableStatus,
) {
	const query = useInfiniteQuery({
		queryKey: flashcardTableQueryKey(deckId ?? "", status),
		queryFn: ({ pageParam }) =>
			fetchFlashcardList({
				deckId: deckId as string,
				status,
				page: pageParam,
				limit: FLASHCARD_PAGE_SIZE,
				shuffle: false,
				sortBy: "createdAt",
				order: "desc",
			}),
		initialPageParam: 1,
		getNextPageParam,
		enabled: !!deckId,
	});

	const cards = useMemo(
		() => query.data?.pages.flatMap((page) => page.data) ?? [],
		[query.data?.pages],
	);

	const total = query.data?.pages[0]?.pagination?.total ?? cards.length;

	return {
		...query,
		cards,
		total,
	};
}
