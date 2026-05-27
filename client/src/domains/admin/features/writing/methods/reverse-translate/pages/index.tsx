import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useDeferredValue,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { RowSelectionState } from "@tanstack/react-table";

import {
	bulkDeleteAdminRTExercises,
	deleteAdminRTExercise,
	fetchAdminRTList,
} from "@shared/api/reverse-translate";
import type {
	AdminRTListItem,
	AdminRTListParams,
} from "@shared/types/reverse-translate";
import type { APIResponse } from "@shared/types/utils";

import { DataTable } from "@admin/components/data-table";
import {
	createRTColumns,
	type RTAdminSortField,
} from "@admin/features/writing/methods/reverse-translate/components/columns";
import { RTDeletingIdProvider } from "@admin/features/writing/methods/reverse-translate/components/deleting-provider";
import { RTBulkDeleteDialog } from "@admin/features/writing/methods/reverse-translate/components/bulk-delete-dialog";
import { ADMIN_RT_LIST_QUERY_KEY } from "@admin/features/writing/methods/reverse-translate/components/form-options";
import { RTListPagination } from "@admin/features/writing/methods/reverse-translate/components/list-pagination";
import { RTListToolbar } from "@admin/features/writing/methods/reverse-translate/components/list-toolbar";
import { Skeleton } from "@shared/components/ui/skeleton";

const RT_ITEMS_PER_PAGE = 10;
const RT_ALL_FILTER = "all";

const RTCreateDialog = lazy(() =>
	import("@admin/features/writing/methods/reverse-translate/components/create-dialog").then(
		(m) => ({ default: m.RTCreateDialog }),
	),
);

const RTEditDialog = lazy(() =>
	import("@admin/features/writing/methods/reverse-translate/components/edit-dialog").then(
		(m) => ({ default: m.RTEditDialog }),
	),
);

function DialogSuspenseFallback() {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
			<Skeleton className="h-10 w-48 rounded-lg" />
		</div>
	);
}

const pageHeader = (
	<div className="flex flex-col gap-1">
		<h1 className="text-xl font-bold">Dịch ngược</h1>
		<p className="text-sm text-muted-foreground">
			Quản lý dữ liệu bài tập cho phương pháp dịch ngược.
		</p>
	</div>
);

export function ReverseTranslate() {
	const queryClient = useQueryClient();
	const [, startListTransition] = useTransition();

	const [searchInput, setSearchInput] = useState("");
	const deferredSearch = useDeferredValue(searchInput.trim());
	const prevDeferredSearchRef = useRef(deferredSearch);

	const [levelFilter, setLevelFilter] = useState(RT_ALL_FILTER);
	const [topicFilter, setTopicFilter] = useState(RT_ALL_FILTER);
	const [contentTypeFilter, setContentTypeFilter] = useState(RT_ALL_FILTER);
	const [page, setPage] = useState(1);
	const [sortBy, setSortBy] = useState<RTAdminSortField>("level");
	const [order, setOrder] = useState<"asc" | "desc">("asc");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [deletingId, setDeletingId] = useState<string | undefined>();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);

	const selectedCount = useMemo(() => {
		let count = 0;
		for (const id in rowSelection) {
			if (rowSelection[id]) count += 1;
		}
		return count;
	}, [rowSelection]);

	// Reset trang/chọn khi giá trị search dùng cho API thay đổi (sau defer)
	useEffect(() => {
		if (prevDeferredSearchRef.current === deferredSearch) return;
		prevDeferredSearchRef.current = deferredSearch;
		startListTransition(() => {
			setRowSelection({});
			setPage(1);
		});
	}, [deferredSearch]);

	const queryParams = useMemo((): AdminRTListParams => {
		const params: AdminRTListParams = {
			page,
			limit: RT_ITEMS_PER_PAGE,
			sortBy,
			order,
		};

		if (deferredSearch) params.search = deferredSearch;
		if (levelFilter !== RT_ALL_FILTER) params.level = levelFilter;
		if (topicFilter !== RT_ALL_FILTER) params.topic = topicFilter;
		if (contentTypeFilter !== RT_ALL_FILTER)
			params.contentType = contentTypeFilter;

		return params;
	}, [
		page,
		deferredSearch,
		levelFilter,
		topicFilter,
		contentTypeFilter,
		sortBy,
		order,
	]);

	const listQueryKey = useMemo(
		() => [...ADMIN_RT_LIST_QUERY_KEY, queryParams] as const,
		[queryParams],
	);

	const { data, isLoading, isError } = useQuery({
		queryKey: listQueryKey,
		queryFn: () => fetchAdminRTList(queryParams),
		placeholderData: keepPreviousData,
	});

	const items = data?.data ?? [];
	const pagination = data?.pagination;

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteAdminRTExercise(id),
		onMutate: (id) => {
			setDeletingId(id);
		},
		onSettled: () => {
			setDeletingId(undefined);
		},
		onSuccess: async (_, deletedId) => {
			setRowSelection((prev) => {
				const next = { ...prev };
				delete next[deletedId];
				return next;
			});

			const cached =
				queryClient.getQueryData<APIResponse<AdminRTListItem[]>>(listQueryKey);
			const itemCount = cached?.data?.length ?? 0;

			await queryClient.invalidateQueries({
				queryKey: ADMIN_RT_LIST_QUERY_KEY,
			});

			if (itemCount === 1 && page > 1) {
				startListTransition(() => setPage((p) => p - 1));
			}

			toast.success("Xóa bài tập thành công");
		},
		onError: () => {
			toast.error("Không thể xóa bài tập.");
		},
	});

	const bulkDeleteMutation = useMutation({
		mutationFn: (ids: string) => bulkDeleteAdminRTExercises(ids),
		onSuccess: async (response) => {
			const deleted = response?.deleted ?? 0;
			setRowSelection({});
			setDeleteDialogOpen(false);

			const cached =
				queryClient.getQueryData<APIResponse<AdminRTListItem[]>>(listQueryKey);
			const itemCount = cached?.data?.length ?? 0;

			await queryClient.invalidateQueries({
				queryKey: ADMIN_RT_LIST_QUERY_KEY,
			});

			if (itemCount <= deleted && page > 1) {
				startListTransition(() => setPage((p) => p - 1));
			}

			toast.success(`Đã xóa ${deleted} mục`);
		},
		onError: () => {
			toast.error("Không thể xóa các bài tập đã chọn.");
		},
	});

	const handleConfirmBulkDelete = useCallback(() => {
		const ids = Object.keys(rowSelection).filter((id) => rowSelection[id]);
		if (ids.length === 0) return;
		bulkDeleteMutation.mutate(ids.join(","));
	}, [rowSelection, bulkDeleteMutation]);

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
		(field: RTAdminSortField) => {
			startListTransition(() => {
				if (sortBy === field) {
					setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
				} else {
					setSortBy(field);
					setOrder(field === "createdAt" ? "desc" : "asc");
				}
				setRowSelection({});
				setPage(1);
			});
		},
		[sortBy],
	);

	const columns = useMemo(
		() =>
			createRTColumns({
				sortBy,
				order,
				onSort: handleSort,
				onEditRow,
				onDeleteRow,
			}),
		[sortBy, order, handleSort, onEditRow, onDeleteRow],
	);

	const onLevelFilterChange = useCallback((value: string) => {
		startListTransition(() => {
			setLevelFilter(value);
			setRowSelection({});
			setPage(1);
		});
	}, []);

	const onTopicFilterChange = useCallback((value: string) => {
		startListTransition(() => {
			setTopicFilter(value);
			setRowSelection({});
			setPage(1);
		});
	}, []);

	const onContentTypeFilterChange = useCallback((value: string) => {
		startListTransition(() => {
			setContentTypeFilter(value);
			setRowSelection({});
			setPage(1);
		});
	}, []);

	const onPageChange = useCallback((nextPage: number) => {
		startListTransition(() => setPage(nextPage));
	}, []);

	const onCreateDialogOpenChange = useCallback((open: boolean) => {
		setCreateDialogOpen(open);
	}, []);

	return (
		<div className="flex flex-col gap-6">
			{pageHeader}

			<RTListToolbar
				searchInput={searchInput}
				onSearchChange={setSearchInput}
				levelFilter={levelFilter}
				topicFilter={topicFilter}
				contentTypeFilter={contentTypeFilter}
				selectedCount={selectedCount}
				onAddClick={() => setCreateDialogOpen(true)}
				onBulkDeleteClick={() => setDeleteDialogOpen(true)}
				onLevelFilterChange={onLevelFilterChange}
				onTopicFilterChange={onTopicFilterChange}
				onContentTypeFilterChange={onContentTypeFilterChange}
			/>

			{isError ? (
				<p className="text-sm text-muted-foreground">
					Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
				</p>
			) : (
				<div className="flex flex-col gap-3">
					<RTDeletingIdProvider deletingId={deletingId}>
						<DataTable
							columns={columns}
							data={items}
							isLoading={isLoading}
							emptyMessage="Không tìm thấy bài tập nào phù hợp."
							enableRowSelection
							rowSelection={rowSelection}
							onRowSelectionChange={setRowSelection}
						/>
					</RTDeletingIdProvider>
					<p className="text-sm self-end text-muted-foreground">
						Tổng số {pagination?.total} mục
					</p>
				</div>
			)}

			{pagination ? (
				<RTListPagination
					page={page}
					totalPages={pagination.totalPages}
					onPageChange={onPageChange}
				/>
			) : null}

			{createDialogOpen ? (
				<Suspense fallback={<DialogSuspenseFallback />}>
					<RTCreateDialog open onOpenChange={onCreateDialogOpenChange} />
				</Suspense>
			) : null}

			{editDialogOpen && editingId ? (
				<Suspense fallback={<DialogSuspenseFallback />}>
					<RTEditDialog
						open
						onOpenChange={onEditDialogOpenChange}
						exerciseId={editingId}
					/>
				</Suspense>
			) : null}

			{deleteDialogOpen ? (
				<RTBulkDeleteDialog
					open
					onOpenChange={setDeleteDialogOpen}
					selectedCount={selectedCount}
					isPending={bulkDeleteMutation.isPending}
					onConfirm={handleConfirmBulkDelete}
				/>
			) : null}
		</div>
	);
}
