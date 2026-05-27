import type { ColumnDef } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowDown01Icon,
	ArrowUp01Icon,
	UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";

import type { AdminRTListItem } from "@shared/types/reverse-translate";
import type {
	ExerciseLevel,
	WritingContentType,
	WritingExerciseTopic,
} from "@shared/types/utils";
import { cn, translateContentType, translateTopic } from "@shared/lib/utils";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";

import { RTActionsCell } from "@admin/features/writing/methods/reverse-translate/components/actions-cell";

const levelStyle: Record<ExerciseLevel, string> = {
	beginner: "bg-green-100 text-green-700",
	intermediate: "bg-sky-100 text-sky-700",
	advanced: "bg-rose-100 text-rose-700",
};

const levelLabels: Record<ExerciseLevel, string> = {
	beginner: "Cơ bản",
	intermediate: "Trung cấp",
	advanced: "Nâng cao",
};

function formatCreatedAt(value: string) {
	return new Intl.DateTimeFormat("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}

export type RTAdminSortField = "level" | "createdAt";

export type RTColumnsOptions = {
	sortBy: RTAdminSortField;
	order: "asc" | "desc";
	onSort: (field: RTAdminSortField) => void;
	onEditRow: (id: string) => void;
	onDeleteRow: (id: string) => void;
};

function renderSortableHeader(
	label: string,
	field: RTAdminSortField,
	sortBy: RTAdminSortField,
	order: "asc" | "desc",
	onSort: (field: RTAdminSortField) => void,
) {
	const isActive = sortBy === field;

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="-ml-3 h-8 gap-1 px-2 font-medium"
			onClick={() => onSort(field)}
		>
			{label}
			{isActive ? (
				<HugeiconsIcon
					icon={order === "asc" ? ArrowUp01Icon : ArrowDown01Icon}
					className="size-3.5 text-secondary-black"
				/>
			) : (
				<HugeiconsIcon
					icon={UnfoldMoreIcon}
					className="size-3.5 text-secondary-black"
				/>
			)}
		</Button>
	);
}

export function createRTColumns({
	sortBy,
	order,
	onSort,
	onEditRow,
	onDeleteRow,
}: RTColumnsOptions): ColumnDef<AdminRTListItem>[] {
	return [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Chọn tất cả"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Chọn dòng"
				/>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "level",
			header: () =>
				renderSortableHeader("Cấp độ", "level", sortBy, order, onSort),
			cell: ({ row }) => {
				const level = row.getValue("level") as ExerciseLevel;
				return (
					<Badge className={cn(levelStyle[level], "font-normal")}>
						{levelLabels[level]}
					</Badge>
				);
			},
		},
		{
			accessorKey: "topic",
			header: "Chủ đề",
			cell: ({ row }) =>
				translateTopic(row.getValue("topic") as WritingExerciseTopic),
		},
		{
			accessorKey: "title",
			header: "Tiêu đề",
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue("title")}</span>
			),
		},
		{
			accessorKey: "contentType",
			header: "Loại bài",
			cell: ({ row }) =>
				translateContentType(row.getValue("contentType") as WritingContentType),
		},
		{
			accessorKey: "createdAt",
			header: () =>
				renderSortableHeader("Ngày tạo", "createdAt", sortBy, order, onSort),
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{formatCreatedAt(row.getValue("createdAt"))}
				</span>
			),
		},
		{
			id: "actions",
			header: () => <span className="sr-only">Thao tác</span>,
			enableSorting: false,
			cell: ({ row }) => (
				<RTActionsCell
					id={row.original.id}
					onEditRow={onEditRow}
					onDeleteRow={onDeleteRow}
				/>
			),
		},
	];
}
