import {
	type ColumnDef,
	type OnChangeFn,
	type RowSelectionState,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";

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

interface DataTableProps<TData extends { id: string }, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	isLoading?: boolean;
	emptyMessage?: string;
	skeletonRowCount?: number;
	className?: string;
	rowSelection?: RowSelectionState;
	onRowSelectionChange?: OnChangeFn<RowSelectionState>;
	enableRowSelection?: boolean;
}

export function DataTable<TData extends { id: string }, TValue>({
	columns,
	data,
	isLoading = false,
	emptyMessage = "Không có dữ liệu.",
	skeletonRowCount = 5,
	className,
	rowSelection,
	onRowSelectionChange,
	enableRowSelection = false,
}: DataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
		enableRowSelection,
		onRowSelectionChange,
		state: rowSelection !== undefined ? { rowSelection } : undefined,
	});

	const columnCount = columns.length;

	return (
		<div className={cn("overflow-hidden rounded-2xl border", className)}>
			<Table className="bg-neutral-50">
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{isLoading ? (
						Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
							<TableRow key={`skeleton-${rowIndex}`}>
								{Array.from({ length: columnCount }).map((__, cellIndex) => (
									<TableCell key={`skeleton-${rowIndex}-${cellIndex}`}>
										<Skeleton className="h-4 w-full" />
									</TableCell>
								))}
							</TableRow>
						))
					) : table.getRowModel().rows.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() ? "selected" : undefined}
								className="hover:bg-muted/50"
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell
										key={cell.id}
										className={cn(cell.column.id === "image" && "w-14 p-1")}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={columnCount}
								className="h-24 text-center text-muted-foreground"
							>
								{emptyMessage}
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
