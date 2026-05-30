import { memo, useCallback, useMemo } from "react";

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@shared/components/ui/pagination";

function generatePageNumbers(
	current: number,
	total: number,
): (number | "ellipsis")[] {
	if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

	const pages: (number | "ellipsis")[] = [1];

	if (current > 3) pages.push("ellipsis");

	const start = Math.max(2, current - 1);
	const end = Math.min(total - 1, current + 1);
	for (let i = start; i <= end; i++) pages.push(i);

	if (current < total - 2) pages.push("ellipsis");

	pages.push(total);
	return pages;
}

type ParaphraseListPaginationProps = {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
};

export const ParaphraseListPagination = memo(function ParaphraseListPagination({
	page,
	totalPages,
	onPageChange,
}: ParaphraseListPaginationProps) {
	const pageNumbers = useMemo(
		() => generatePageNumbers(page, totalPages),
		[page, totalPages],
	);

	const goToPrevious = useCallback(() => {
		onPageChange(Math.max(1, page - 1));
	}, [onPageChange, page]);

	const goToNext = useCallback(() => {
		onPageChange(Math.min(totalPages, page + 1));
	}, [onPageChange, page, totalPages]);

	if (totalPages <= 1) return null;

	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						onClick={goToPrevious}
						aria-disabled={page === 1}
						className={
							page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
						}
					/>
				</PaginationItem>

				{pageNumbers.map((p, i) =>
					p === "ellipsis" ? (
						<PaginationItem key={`ellipsis-${i}`}>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={p}>
							<PaginationLink
								isActive={p === page}
								onClick={() => onPageChange(p)}
								className="cursor-pointer"
							>
								{p}
							</PaginationLink>
						</PaginationItem>
					),
				)}

				<PaginationItem>
					<PaginationNext
						onClick={goToNext}
						aria-disabled={page === totalPages}
						className={
							page === totalPages
								? "pointer-events-none opacity-50"
								: "cursor-pointer"
						}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
});
