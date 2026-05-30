import type { Transaction, TransactionType } from "@shared/types/wallet";
import { translateTransactionType } from "@shared/lib/utils";
import { cn } from "@shared/lib/utils";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@shared/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";
import { TransactionTypeBadge } from "@user/features/wallet/components/transaction-type-badge";
import {
	formatTransactionAmount,
	formatTransactionDateTime,
	translateTransactionReason,
} from "@user/features/wallet/utils/transaction-display";

const TABLE_COLUMNS = [
	"Loại",
	"Khối lượng",
	"Số dư",
	"Mô tả",
	"Khởi tạo",
] as const;

const SKELETON_ROW_COUNT = 4;

export const TRANSACTION_TYPE_FILTER_ALL = "all" as const;

export type TransactionTypeFilter =
	| typeof TRANSACTION_TYPE_FILTER_ALL
	| TransactionType;

const TYPE_FILTER_OPTIONS: {
	value: TransactionTypeFilter;
	label: string;
}[] = [
	{ value: TRANSACTION_TYPE_FILTER_ALL, label: "Tất cả loại" },
	{ value: "signup_bonus", label: translateTransactionType("signup_bonus") },
	{ value: "purchase_pack", label: translateTransactionType("purchase_pack") },
	{ value: "charge_submit", label: translateTransactionType("charge_submit") },
	{
		value: "refund_ai_fail",
		label: translateTransactionType("refund_ai_fail"),
	},
];

type TransactionsTableProps = {
	items: Transaction[];
	isLoading: boolean;
	typeFilter: TransactionTypeFilter;
	onTypeFilterChange: (value: TransactionTypeFilter) => void;
};

/**
 * Bảng lịch sử giao dịch kèm lọc theo loại.
 * @param props.items — danh sách giao dịch trang hiện tại
 * @param props.isLoading — trạng thái tải
 * @param props.typeFilter — giá trị lọc loại
 * @param props.onTypeFilterChange — callback đổi lọc
 * @returns Bảng giao dịch
 */
export function TransactionsTable({
	items,
	isLoading,
	typeFilter,
	onTypeFilterChange,
}: TransactionsTableProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="text-base font-semibold">Lịch sử giao dịch</h2>
				<Select
					value={typeFilter}
					onValueChange={(v) => onTypeFilterChange(v as TransactionTypeFilter)}
				>
					<SelectTrigger className="w-full sm:w-48 bg-neutral-50">
						<SelectValue placeholder="Lọc theo loại" />
					</SelectTrigger>
					<SelectContent position="popper">
						{TYPE_FILTER_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="overflow-x-auto rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							{TABLE_COLUMNS.map((col) => (
								<TableHead key={col}>{col}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading &&
							Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
								<TableRow key={i}>
									{TABLE_COLUMNS.map((col) => (
										<TableCell key={col}>
											<Skeleton className="h-5 w-full max-w-32" />
										</TableCell>
									))}
								</TableRow>
							))}
						{!isLoading && items.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={TABLE_COLUMNS.length}
									className="h-24 text-center text-muted-foreground"
								>
									Chưa có giao dịch.
								</TableCell>
							</TableRow>
						)}
						{!isLoading &&
							items.map((tx) => (
								<TableRow key={tx._id}>
									<TableCell>
										<TransactionTypeBadge type={tx.type} />
									</TableCell>
									<TableCell
										className={cn(
											"tabular-nums",
											tx.amount < 0 && "text-red-600",
											tx.amount > 0 && "text-green-600",
										)}
									>
										{formatTransactionAmount(tx.amount)}
									</TableCell>
									<TableCell className="tabular-nums">
										{tx.balanceAfter ?? "—"}
									</TableCell>
									<TableCell className="max-w-xs">
										{translateTransactionReason(tx.type, tx.reason)}
									</TableCell>
									<TableCell className="whitespace-nowrap text-muted-foreground">
										{formatTransactionDateTime(tx.createdAt)}
									</TableCell>
								</TableRow>
							))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
