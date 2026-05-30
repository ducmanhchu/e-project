import { WordTable } from "@user/features/vocabulary/components/word-table";

type UnknownWordTableProps = {
	deckId: string;
};

/**
 * Bảng từ vựng đang học (status unknown) của một học phần.
 * @param props.deckId — id học phần
 * @returns JSX.Element hoặc null khi không có từ
 */
export function UnknownWordTable({ deckId }: UnknownWordTableProps) {
	return <WordTable deckId={deckId} status="unknown" title="Từ đang học" />;
}
