import { useNavigate, useParams } from "react-router";
import {
	useState,
	useCallback,
	useMemo,
	startTransition,
	lazy,
	Suspense,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowLeft02Icon,
	Edit03Icon,
	Delete01Icon,
	TaskDaily01Icon,
	ShuffleIcon,
	PlusSignIcon,
} from "@hugeicons/core-free-icons";

import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQuery,
	type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
	fetchDeckDetail,
	fetchFlashcardList,
	updateFlashcardStatus,
} from "@shared/api/vocab";
import { queryClient } from "@shared/lib/query-client";
import type { APIResponse } from "@shared/types/utils";
import type { Flashcard } from "@shared/types/vocab";

import {
	FLASHCARD_PAGE_SIZE,
	FLASHCARD_PREFETCH_THRESHOLD,
	FLASHCARD_STATUS_FILTER_OPTIONS,
	FLASHCARD_TABLE_QUERY_KEY,
	VOCAB_ROUTES,
	type FlashcardStatusFilter,
} from "@user/features/vocabulary/utils/constants";
import {
	getDateString,
	getNextPageParam,
} from "@user/features/vocabulary/utils/helpers";

import { Button } from "@shared/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Toggle } from "@shared/components/ui/toggle";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";
import { Separator } from "@shared/components/ui/separator";
import { FlashcardCarousel } from "@/domains/user/features/vocabulary/components/flashcard-carousel";
import { UnknownWordTable } from "@/domains/user/features/vocabulary/components/unknown-word-table";
import { KnownWordTable } from "@/domains/user/features/vocabulary/components/known-word-table";

/** Skeleton khớp kích thước FlashCard khi đang tải danh sách thẻ. */
function FlashCardSkeleton() {
	return (
		<div className="w-full max-w-4xl space-y-4">
			<Skeleton className="h-[min(62vh,500px)] w-full rounded-2xl" />
			<div className="flex justify-between">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-5 w-16" />
			</div>
		</div>
	);
}

const VocabDeckUpdateDialog = lazy(() =>
	import("@user/features/vocabulary/components/deck-update-dialog").then(
		(m) => ({
			default: m.VocabDeckUpdateDialog,
		}),
	),
);

const VocabDeckDeleteDialog = lazy(() =>
	import("@user/features/vocabulary/components/deck-delete-dialog").then(
		(m) => ({
			default: m.VocabDeckDeleteDialog,
		}),
	),
);

const VocabDeckAddWordDialog = lazy(() =>
	import("@user/features/vocabulary/components/deck-add-word-dialog").then(
		(m) => ({
			default: m.VocabDeckAddWordDialog,
		}),
	),
);

const VocabTestSetupDialog = lazy(() =>
	import("@user/features/vocabulary/components/test-setup-dialog").then(
		(m) => ({
			default: m.VocabTestSetupDialog,
		}),
	),
);

export function VocabularyDeck() {
	const navigate = useNavigate();

	const { deckId } = useParams<{ deckId: string }>();

	const [updateOpen, setUpdateOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [addWordOpen, setAddWordOpen] = useState(false);
	const [testSetupOpen, setTestSetupOpen] = useState(false);
	const [shuffled, setShuffled] = useState(false);
	const [trackProgress, setTrackProgress] = useState(false);
	const [statusFilter, setStatusFilter] =
		useState<FlashcardStatusFilter>("all");

	const flashcardsListFilter: FlashcardStatusFilter = trackProgress
		? statusFilter
		: "all";

	const flashcardsQueryKey = useMemo(
		() =>
			["flashcards", "list", deckId, shuffled, flashcardsListFilter] as const,
		[deckId, shuffled, flashcardsListFilter],
	);

	const deckQuery = useQuery({
		queryKey: ["deck", "detail", deckId],
		queryFn: () => fetchDeckDetail(deckId as string),
		enabled: !!deckId,
	});

	const flashcardsQuery = useInfiniteQuery({
		queryKey: flashcardsQueryKey,
		queryFn: ({ pageParam }) =>
			fetchFlashcardList({
				deckId: deckId as string,
				page: pageParam,
				limit: FLASHCARD_PAGE_SIZE,
				shuffle: shuffled,
				...(trackProgress && statusFilter !== "all"
					? { status: statusFilter }
					: {}),
			}),
		initialPageParam: 1,
		getNextPageParam,
		enabled: !!deckId,
		placeholderData: keepPreviousData,
	});

	const statusMutation = useMutation({
		mutationFn: ({
			cardId,
			status,
		}: {
			cardId: string;
			status: "known" | "unknown";
		}) => updateFlashcardStatus(cardId, { status }),
		onSuccess: (_response, { cardId, status }) => {
			queryClient.setQueryData<InfiniteData<APIResponse<Flashcard[]>>>(
				flashcardsQueryKey,
				(old) => {
					if (!old) return old;

					const shouldRemove =
						trackProgress && statusFilter !== "all" && statusFilter !== status;

					if (shouldRemove) {
						let removed = false;
						const pages = old.pages.map((page, pageIndex) => {
							const filtered = page.data.filter((card) => card._id !== cardId);
							if (filtered.length !== page.data.length) removed = true;
							return {
								...page,
								data: filtered,
								pagination:
									pageIndex === 0 && page.pagination
										? {
												...page.pagination,
												total: Math.max(0, page.pagination.total - 1),
											}
										: page.pagination,
							};
						});
						return removed ? { ...old, pages } : old;
					}

					const pages = old.pages.map((page) => ({
						...page,
						data: page.data.map((card) =>
							card._id === cardId ? { ...card, status } : card,
						),
					}));
					return { ...old, pages };
				},
			);

			// Các bộ lọc khác dùng cache riêng — đánh dấu stale để refetch khi chuyển chế độ
			void queryClient.invalidateQueries({
				queryKey: ["flashcards", "list", deckId],
				predicate: (query) => query.queryKey[3] !== shuffled,
				refetchType: "none",
			});

			void queryClient.invalidateQueries({
				queryKey: ["flashcards", FLASHCARD_TABLE_QUERY_KEY, deckId],
			});
		},
		onError: () => {
			toast.error("Không thể cập nhật tiến trình");
		},
	});

	const { isFetchingNextPage, hasNextPage, fetchNextPage } = flashcardsQuery;

	const flashcards = useMemo(
		() => flashcardsQuery.data?.pages.flatMap((page) => page.data) ?? [],
		[flashcardsQuery.data?.pages],
	);

	const totalCards =
		flashcardsQuery.data?.pages[0]?.pagination?.total ?? flashcards.length;

	const isDeckLoading = deckQuery.isLoading;
	const isFlashcardsLoading = flashcardsQuery.isLoading;
	const isFlashcardsRefetching =
		flashcardsQuery.isFetching &&
		!flashcardsQuery.isLoading &&
		!flashcardsQuery.isFetchingNextPage;

	const showFlashcardSkeleton = isFlashcardsLoading || isFlashcardsRefetching;

	const prefetchIfNearEnd = useCallback(
		(index: number) => {
			if (isFetchingNextPage || !hasNextPage) return;

			if (index >= flashcards.length - FLASHCARD_PREFETCH_THRESHOLD) {
				void fetchNextPage();
			}
		},

		[flashcards.length, isFetchingNextPage, hasNextPage, fetchNextPage],
	);

	const handleBack = (): void => {
		if (deckQuery.data?.data?.folderId)
			navigate(VOCAB_ROUTES.folder(deckQuery.data.data.folderId));
		else navigate(VOCAB_ROUTES.root);
	};

	const handleShuffleToggle = useCallback((pressed: boolean) => {
		startTransition(() => {
			setShuffled(pressed);
		});
	}, []);

	const handleTrackProgressChange = useCallback((checked: boolean) => {
		setTrackProgress(checked);
		if (!checked) {
			setStatusFilter("all");
		}
	}, []);

	const handleStatusUpdate = useCallback(
		async (cardId: string, status: "known" | "unknown") => {
			await statusMutation.mutateAsync({ cardId, status });
		},
		[statusMutation],
	);

	const emptyFlashcardsMessage =
		trackProgress && statusFilter !== "all"
			? "Không có từ trong nhóm này"
			: "Học phần trống";

	return (
		<div className="flex min-h-[calc(100svh-6.5rem)] flex-col gap-4">
			<div className="flex justify-between items-center">
				<Button
					variant="outline"
					size="icon"
					className="border-secondary-black bg-secondary-white group hover:bg-secondary-black transition-colors duration-300"
					onClick={handleBack}
				>
					<HugeiconsIcon
						icon={ArrowLeft02Icon}
						className="group-hover:text-secondary-white transition-colors duration-300"
					/>
				</Button>

				{isDeckLoading ? (
					<Skeleton className="h-8 w-48 max-w-[50vw]" />
				) : (
					<p className="text-base md:text-xl font-medium md:ps-30">
						{deckQuery.data?.data?.name}
					</p>
				)}

				<div className="flex items-center">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setAddWordOpen(true)}
							>
								<HugeiconsIcon icon={PlusSignIcon} />
							</Button>
						</TooltipTrigger>

						<TooltipContent>
							<p>Thêm từ</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								pressed={shuffled}
								onPressedChange={handleShuffleToggle}
								disabled={isFlashcardsRefetching}
								aria-label="Trộn thẻ"
								className="aria-pressed:bg-secondary-black aria-pressed:text-secondary-white aria-pressed:border-secondary-black"
							>
								<HugeiconsIcon icon={ShuffleIcon} />
							</Toggle>
						</TooltipTrigger>

						<TooltipContent>
							<p>Trộn thẻ</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setUpdateOpen(true)}
							>
								<HugeiconsIcon icon={Edit03Icon} />
							</Button>
						</TooltipTrigger>

						<TooltipContent>
							<p>Sửa</p>
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setDeleteOpen(true)}
							>
								<HugeiconsIcon
									icon={Delete01Icon}
									className="text-destructive"
								/>
							</Button>
						</TooltipTrigger>

						<TooltipContent>
							<p>Xóa</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 self-center w-full">
				{showFlashcardSkeleton ? (
					<FlashCardSkeleton />
				) : (
					<div className="flex w-full max-w-4xl flex-col items-center gap-4">
						{trackProgress ? (
							<Select
								value={statusFilter}
								onValueChange={(value) =>
									setStatusFilter(value as FlashcardStatusFilter)
								}
							>
								<SelectTrigger className="w-full max-w-3xs bg-neutral-50 self-end">
									<SelectValue placeholder="Lọc theo trạng thái" />
								</SelectTrigger>
								<SelectContent position="popper">
									{FLASHCARD_STATUS_FILTER_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null}

						{flashcards.length > 0 ? (
							<FlashcardCarousel
								flashcards={flashcards}
								totalCards={totalCards}
								shuffled={shuffled}
								statusFilter={statusFilter}
								trackProgress={trackProgress}
								onTrackProgressChange={handleTrackProgressChange}
								onStatusUpdate={handleStatusUpdate}
								isUpdatingStatus={statusMutation.isPending}
								onPrefetchNearEnd={prefetchIfNearEnd}
							/>
						) : (
							<p className="text-muted-foreground text-sm self-center justify-self-center">
								{emptyFlashcardsMessage}
							</p>
						)}
					</div>
				)}
			</div>

			<Separator className="mt-16" />

			<div className="flex justify-between items-center mb-14">
				<div className="flex flex-col gap-1.5">
					{isDeckLoading ? (
						<>
							<Skeleton className="h-4 w-36" />

							<Skeleton className="h-5 w-full max-w-md" />
						</>
					) : (
						<>
							<p className="text-muted-foreground text-sm">
								Khởi tạo {getDateString(deckQuery.data?.data?.createdAt)}
							</p>

							<p className="text-black text-base">
								{deckQuery.data?.data?.description}
							</p>
						</>
					)}
				</div>

				{!showFlashcardSkeleton && flashcards.length > 0 ? (
					<Button variant="blackHover" onClick={() => setTestSetupOpen(true)}>
						<HugeiconsIcon icon={TaskDaily01Icon} />
						Kiểm tra
					</Button>
				) : null}
			</div>

			{deckId ? (
				<div className="flex flex-col gap-8 mb-18">
					<UnknownWordTable deckId={deckId} />
					<KnownWordTable deckId={deckId} />
				</div>
			) : null}

			{updateOpen || deleteOpen || addWordOpen || testSetupOpen ? (
				<Suspense fallback={null}>
					{updateOpen ? (
						<VocabDeckUpdateDialog
							open={updateOpen}
							onOpenChange={setUpdateOpen}
							deckId={deckId as string}
							currentName={deckQuery.data?.data?.name ?? ""}
							currentDescription={deckQuery.data?.data?.description ?? ""}
						/>
					) : null}

					{deleteOpen ? (
						<VocabDeckDeleteDialog
							open={deleteOpen}
							onOpenChange={setDeleteOpen}
							deckId={deckId as string}
							deckName={deckQuery.data?.data?.name ?? ""}
						/>
					) : null}

					{addWordOpen && deckId ? (
						<VocabDeckAddWordDialog
							open={addWordOpen}
							onOpenChange={setAddWordOpen}
							deckId={deckId}
						/>
					) : null}

					{testSetupOpen && deckId ? (
						<VocabTestSetupDialog
							open={testSetupOpen}
							onOpenChange={setTestSetupOpen}
							deckId={deckId}
							maxCount={totalCards}
						/>
					) : null}
				</Suspense>
			) : null}
		</div>
	);
}
