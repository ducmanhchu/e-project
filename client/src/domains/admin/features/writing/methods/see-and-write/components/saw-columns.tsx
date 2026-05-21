import type { ColumnDef } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowDown01Icon,
	ArrowUp01Icon,
	Delete01Icon,
	Loading02Icon,
	PencilEdit01Icon,
	UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";

import type { SAWAdminListItem } from "@shared/types/see-and-write";
import type { ExerciseLevel, WritingExerciseTopic } from "@shared/types/utils";
import { cn, translateTopic } from "@shared/lib/utils";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";

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

export type AdminSortField = "level" | "createdAt";

export type SAWColumnsOptions = {
	sortBy: AdminSortField;
	order: "asc" | "desc";
	onSort: (field: AdminSortField) => void;
	onEditRow: (id: string) => void;
	onDeleteRow: (id: string) => void;
	deletingId?: string;
};

function renderSortableHeader(
	label: string,
	field: AdminSortField,
	sortBy: AdminSortField,
	order: "asc" | "desc",
	onSort: (field: AdminSortField) => void,
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

export function createSAWColumns({
	sortBy,
	order,
	onSort,
	onEditRow,
	onDeleteRow,
	deletingId,
}: SAWColumnsOptions): ColumnDef<SAWAdminListItem>[] {
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
			id: "image",
			accessorKey: "image",
			header: "Ảnh",
			enableSorting: false,
			cell: ({ row }) => {
				const src = row.getValue("image") as string;
				return (
					<img
						src={src}
						alt={row.original.title}
						className="size-12 shrink-0 rounded-md object-cover"
					/>
				);
			},
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
			cell: ({ row }) => {
				const id = row.original.id;
				const isDeleting = deletingId === id;

				return (
					<div className="flex items-center justify-end gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onEditRow(id)}
						>
							<HugeiconsIcon
								icon={PencilEdit01Icon}
								className="size-3.5 text-secondary-black"
							/>
							Sửa
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive"
							disabled={isDeleting}
							onClick={() => onDeleteRow(id)}
						>
							{isDeleting ? (
								<HugeiconsIcon
									icon={Loading02Icon}
									className="size-3.5 text-secondary-red animate-spin"
								/>
							) : (
								<>
									<HugeiconsIcon
										icon={Delete01Icon}
										className="size-3.5 text-secondary-red"
									/>
									Xóa
								</>
							)}
						</Button>
					</div>
				);
			},
		},
	];
}
