import { useDeferredValue, useState } from "react";

import type { APIResponse } from "@shared/types/utils";

/**
 * State tìm kiếm với defer để giảm request khi gõ nhanh.
 * @returns searchInput, setSearchInput và deferredSearch dùng cho query API.
 */
export function useVocabSearch() {
	const [searchInput, setSearchInput] = useState("");
	const deferredSearch = useDeferredValue(searchInput.trim());
	return { searchInput, setSearchInput, deferredSearch };
}

/**
 * Tham số search cho API list (bỏ qua khi rỗng).
 * @param search - Chuỗi đã trim từ deferred search.
 */
export function vocabSearchParams(search: string) {
	return search ? { search } : {};
}

/**
 * Trả về số trang kế tiếp cho useInfiniteQuery, hoặc undefined nếu đã hết.
 * @param last - Response trang cuối từ API có pagination.
 */
export function getNextPageParam<T>(last: APIResponse<T[]>) {
	const p = last.pagination;
	if (!p || p.page >= p.totalPages) return undefined;
	return p.page + 1;
}

export function getDateString(date: string | undefined) {
	if (!date) return "Không xác định";
	const d = new Date(date);
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const year = d.getFullYear();
	return `${day}/${month}/${year}`;
}