import { useCallback, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CoinbaseIcon, Invoice01Icon } from "@hugeicons/core-free-icons";

import type { TransactionType } from "@shared/types/wallet";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@shared/components/ui/pagination";
import { Card, CardContent } from "@shared/components/ui/card";

import { useBalance } from "@user/features/wallet/hooks/use-balance";
import { useTransactions } from "@user/features/wallet/hooks/use-transactions";
import { TransactionStatCard } from "@user/features/wallet/components/transaction-stat-card";
import {
	TRANSACTION_TYPE_FILTER_ALL,
	TransactionsTable,
	type TransactionTypeFilter,
} from "@user/features/wallet/components/transactions-table";

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

/**
 * Trang thông tin giao dịch: thống kê + bảng lịch sử có phân trang và lọc loại.
 * @returns Trang MyTransactions
 */
export function MyTransactions() {
	const [page, setPage] = useState(1);
	const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>(
		TRANSACTION_TYPE_FILTER_ALL,
	);

	const apiType: TransactionType | undefined =
		typeFilter === TRANSACTION_TYPE_FILTER_ALL ? undefined : typeFilter;

	const { data: balanceData, isLoading: isBalanceLoading } = useBalance();
	const {
		items,
		total,
		totalPages,
		isLoading: isTransactionsLoading,
		isError,
	} = useTransactions({ page, type: apiType });

	const credits = balanceData?.data.credits ?? 0;
	const pageNumbers = useMemo(
		() => generatePageNumbers(page, totalPages),
		[page, totalPages],
	);

	const handleTypeFilterChange = useCallback((value: TransactionTypeFilter) => {
		setTypeFilter(value);
		setPage(1);
	}, []);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl md:text-4xl font-extrabold">
					Thông tin giao dịch
				</h1>
				<p className="text-sm md:text-base text-muted-foreground">
					Theo dõi thông tin giao dịch của bạn.
				</p>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<TransactionStatCard
					label="Tổng giao dịch"
					value={total}
					isLoading={isTransactionsLoading}
					icon={<HugeiconsIcon icon={Invoice01Icon} className="size-5" />}
					className="bg-secondary-green"
				/>
				<TransactionStatCard
					label="Số dư hiện tại"
					value={credits}
					isLoading={isBalanceLoading}
					icon={<HugeiconsIcon icon={CoinbaseIcon} className="size-5" />}
					className="bg-secondary-yellow"
				/>
			</div>

			<Card className="py-0">
				<CardContent className="px-6 py-6">
					{isError ? (
						<p className="text-center text-muted-foreground">
							Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
						</p>
					) : (
						<TransactionsTable
							items={items}
							isLoading={isTransactionsLoading}
							typeFilter={typeFilter}
							onTypeFilterChange={handleTypeFilterChange}
						/>
					)}
				</CardContent>
			</Card>

			{!isError && totalPages > 1 && (
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								aria-disabled={page === 1}
								className={
									page === 1
										? "pointer-events-none opacity-50"
										: "cursor-pointer"
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
										onClick={() => setPage(p)}
										className="cursor-pointer"
									>
										{p}
									</PaginationLink>
								</PaginationItem>
							),
						)}

						<PaginationItem>
							<PaginationNext
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
			)}
		</div>
	);
}
