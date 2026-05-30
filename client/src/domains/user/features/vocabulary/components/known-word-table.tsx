import { WordTable } from "@user/features/vocabulary/components/word-table";

type KnownWordTableProps = {
	deckId: string;
};

/**
 * Bảng từ vựng thành thạo (status known) của một học phần.
 * @param props.deckId — id học phần
 * @returns JSX.Element hoặc null khi không có từ
 */
export function KnownWordTable({ deckId }: KnownWordTableProps) {
	return <WordTable deckId={deckId} status="known" title="Từ thành thạo" />;
}
