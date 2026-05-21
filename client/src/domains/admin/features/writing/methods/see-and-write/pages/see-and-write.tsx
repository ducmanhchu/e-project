import { useCallback, useEffect, useMemo, useState } from "react";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { RowSelectionState } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete01Icon } from "@hugeicons/core-free-icons";

import {
	deleteSAWExercise,
	fetchSAWAdminList,
} from "@shared/api/see-and-write";
import type { SAWAdminListQueryParams } from "@shared/types/see-and-write";
import { baseFilterSections } from "@shared/lib/utils";

import { GooeyInput } from "@shared/components/ui/gooey-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@shared/components/ui/pagination";
import { Button } from "@shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@shared/components/ui/dialog";
import { DataTable } from "@admin/components/data-table";
import {
	createSAWColumns,
	type AdminSortField,
} from "@/domains/admin/features/writing/methods/see-and-write/components/saw-columns";
import { SAWCreateDialog } from "@admin/features/writing/methods/see-and-write/components/saw-create-dialog";
import { SAWEditDialog } from "@admin/features/writing/methods/see-and-write/components/saw-edit-dialog";

const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const ALL_FILTER = "all";

const levelSection = baseFilterSections.find((s) => s.id === "level")!;
const topicSection = baseFilterSections.find((s) => s.id === "topic")!;

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

const ADMIN_LIST_QUERY_KEY = ["admin", "see-and-write", "list"] as const;

export function SeeAndWrite() {
	const queryClient = useQueryClient();
	const [searchInput, setSearchInput] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [levelFilter, setLevelFilter] = useState(ALL_FILTER);
	const [topicFilter, setTopicFilter] = useState(ALL_FILTER);
	const [page, setPage] = useState(1);
	const [sortBy, setSortBy] = useState<AdminSortField>("level");
	const [order, setOrder] = useState<"asc" | "desc">("asc");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	const selectedCount = useMemo(
		() => Object.values(rowSelection).filter(Boolean).length,
		[rowSelection],
	);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedSearch(searchInput.trim());
			setRowSelection({});
			setPage(1);
		}, SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [searchInput]);

	const queryParams = useMemo((): SAWAdminListQueryParams => {
		const params: SAWAdminListQueryParams = {
			page,
			limit: ITEMS_PER_PAGE,
			sortBy,
			order,
		};

		if (debouncedSearch) params.search = debouncedSearch;
		if (levelFilter !== ALL_FILTER) params.level = levelFilter;
		if (topicFilter !== ALL_FILTER) params.topic = topicFilter;

		return params;
	}, [page, debouncedSearch, levelFilter, topicFilter, sortBy, order]);

	const { data, isLoading, isError } = useQuery({
		queryKey: [...ADMIN_LIST_QUERY_KEY, queryParams],
		queryFn: () => fetchSAWAdminList(queryParams),
		placeholderData: keepPreviousData,
	});

	const items = data?.data ?? [];
	const pagination = data?.pagination;

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteSAWExercise(id),
		onSuccess: async (_, deletedId) => {
			setRowSelection((prev) => {
				const next = { ...prev };
				delete next[deletedId];
				return next;
			});

			await queryClient.invalidateQueries({ queryKey: ADMIN_LIST_QUERY_KEY });

			if (items.length === 1 && page > 1) {
				setPage((p) => p - 1);
			}

			toast.success("Xóa bài tập thành công");
		},
		onError: () => {
			toast.error("Không thể xóa bài tập.");
		},
	});

	const onDeleteRow = useCallback(
		(id: string) => {
			deleteMutation.mutate(id);
		},
		[deleteMutation],
	);

	const onEditRow = useCallback((id: string) => {
		setEditingId(id);
		setEditDialogOpen(true);
	}, []);

	const onEditDialogOpenChange = useCallback((open: boolean) => {
		setEditDialogOpen(open);
		if (!open) setEditingId(null);
	}, []);

	const handleSort = useCallback(
		(field: AdminSortField) => {
			if (sortBy === field) {
				setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
			} else {
				setSortBy(field);
				setOrder(field === "createdAt" ? "desc" : "asc");
			}
			setRowSelection({});
			setPage(1);
		},
		[sortBy],
	);

	const columns = useMemo(
		() =>
			createSAWColumns({
				sortBy,
				order,
				onSort: handleSort,
				onEditRow,
				onDeleteRow,
				deletingId: deleteMutation.isPending
					? deleteMutation.variables
					: undefined,
			}),
		[
			sortBy,
			order,
			handleSort,
			onEditRow,
			onDeleteRow,
			deleteMutation.isPending,
			deleteMutation.variables,
		],
	);

	const pageNumbers = useMemo(
		() => (pagination ? generatePageNumbers(page, pagination.totalPages) : []),
		[page, pagination],
	);

	const onLevelFilterChange = useCallback((value: string) => {
		setLevelFilter(value);
		setRowSelection({});
		setPage(1);
	}, []);

	const onTopicFilterChange = useCallback((value: string) => {
		setTopicFilter(value);
		setRowSelection({});
		setPage(1);
	}, []);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-xl font-bold">Quan sát và viết</h1>
				<p className="text-sm text-muted-foreground">
					Quản lý dữ liệu bài tập cho phương pháp quan sát và viết.
				</p>
			</div>

			<div className="flex flex-wrap justify-between items-center gap-3">
				<Button
					type="button"
					variant="blackHover"
					onClick={() => setCreateDialogOpen(true)}
				>
					<HugeiconsIcon icon={Add01Icon} />
					Thêm bài tập
				</Button>

				<GooeyInput
					className="self-start"
					collapsedWidth={180}
					expandedWidth={300}
					placeholder="Tìm kiếm bài tập"
					value={searchInput}
					onValueChange={setSearchInput}
				/>

				<div className="flex items-center gap-3">
					{selectedCount > 0 && (
						<div className="flex items-center gap-3">
							<p className="text-sm text-muted-foreground">
								Đã chọn {selectedCount} mục
							</p>
							<Button
								type="button"
								variant="destructive"
								onClick={() => setDeleteDialogOpen(true)}
							>
								<HugeiconsIcon icon={Delete01Icon} />
								Xóa
							</Button>
						</div>
					)}

					<Select value={levelFilter} onValueChange={onLevelFilterChange}>
						<SelectTrigger className="w-[160px]">
							<SelectValue placeholder={levelSection.label} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_FILTER}>Tất cả cấp độ</SelectItem>
							{levelSection.options.map((option) => (
								<SelectItem key={option.id} value={option.id}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={topicFilter} onValueChange={onTopicFilterChange}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder={topicSection.label} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_FILTER}>Tất cả chủ đề</SelectItem>
							{topicSection.options.map((option) => (
								<SelectItem key={option.id} value={option.id}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{isError ? (
				<p className="text-sm text-muted-foreground">
					Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
				</p>
			) : (
				<div className="flex flex-col gap-3">
					<DataTable
						columns={columns}
						data={items}
						isLoading={isLoading}
						emptyMessage="Không tìm thấy bài tập nào phù hợp."
						enableRowSelection
						rowSelection={rowSelection}
						onRowSelectionChange={setRowSelection}
					/>
					<p className="text-sm self-end text-muted-foreground">
						Tổng số {pagination?.total} mục
					</p>
				</div>
			)}

			{pagination && pagination.totalPages > 1 && (
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
								onClick={() =>
									setPage((p) => Math.min(pagination.totalPages, p + 1))
								}
								aria-disabled={page === pagination.totalPages}
								className={
									page === pagination.totalPages
										? "pointer-events-none opacity-50"
										: "cursor-pointer"
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}

			<SAWCreateDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
			/>

			<SAWEditDialog
				open={editDialogOpen}
				onOpenChange={onEditDialogOpenChange}
				exerciseId={editingId}
			/>

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent showCloseButton>
					<DialogHeader>
						<DialogTitle>Xác nhận</DialogTitle>
						<DialogDescription>
							Bạn có chắc muốn xóa{" "}
							<span className="font-medium text-foreground">
								{selectedCount} mục
							</span>{" "}
							đã chọn?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Hủy
						</Button>
						<Button type="button" variant="destructive">
							Xóa
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
