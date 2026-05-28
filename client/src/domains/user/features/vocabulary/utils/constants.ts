/** Số phần tử mỗi trang khi infinite scroll (≈ 3 hàng × 5 cột ở xl). */
export const VOCAB_PAGE_SIZE = 15;

/** Số flashcard mỗi request khi học trong deck (API tối đa 100). */
export const FLASHCARD_PAGE_SIZE = 50;

/** Khi còn bao nhiêu slide tới cuối danh sách đã tải thì prefetch trang kế. */
export const FLASHCARD_PREFETCH_THRESHOLD = 5;

/** Segment query key cho bảng từ theo trạng thái (tách khỏi carousel). */
export const FLASHCARD_TABLE_QUERY_KEY = "table";

/** Số ký tự tối thiểu trước khi gọi API tìm từ trong dialog Thêm từ. */
export const WORD_SEARCH_MIN_CHARS = 2;

/** Debounce ô tìm kiếm từ điển (ms). */
export const WORD_SEARCH_DEBOUNCE_MS = 300;

/** Số kết quả tìm kiếm mỗi trang trong dialog Thêm từ. */
export const WORD_SEARCH_PAGE_LIMIT = 20;

/** Giới hạn thêm từ kho hệ thống vào deck một lần (khớp server). */
export const BULK_FROM_VOCAB_MAX = 50;

export const VOCAB_ROUTES = {
	root: "/vocabulary",
	folder: (folderId: string) => `/vocabulary/folder/${folderId}`,
	deck: (deckId: string) => `/vocabulary/deck/${deckId}`,
} as const;

export type FlashcardStatusFilter = "all" | "known" | "unknown";

export const FLASHCARD_STATUS_FILTER_OPTIONS = [
	{ value: "all", label: "Toàn bộ từ" },
	{ value: "unknown", label: "Từ đang học" },
	{ value: "known", label: "Từ thành thạo" },
] as const satisfies ReadonlyArray<{
	value: FlashcardStatusFilter;
	label: string;
}>;
