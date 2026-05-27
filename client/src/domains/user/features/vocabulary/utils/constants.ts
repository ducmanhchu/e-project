/** Số phần tử mỗi trang khi infinite scroll (≈ 3 hàng × 5 cột ở xl). */
export const VOCAB_PAGE_SIZE = 15;

export const VOCAB_ROUTES = {
	root: "/vocabulary",
	folder: (folderId: string) => `/vocabulary/folders/${folderId}`,
} as const;
