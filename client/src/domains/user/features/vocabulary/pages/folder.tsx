import {
	useCallback,
	useEffect,
	useRef,
	useState,
	lazy,
	Suspense,
} from "react";
import { Link, Navigate, useParams } from "react-router";
import {
	keepPreviousData,
	useInfiniteQuery,
	useQuery,
} from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

import { fetchDeckList, fetchFolderDetail } from "@shared/api/vocab";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@shared/components/ui/breadcrumb";
import { Skeleton } from "@shared/components/ui/skeleton";

import { VocabDeck } from "@user/features/vocabulary/components/deck";
import {
	VOCAB_PAGE_SIZE,
	VOCAB_ROUTES,
} from "@user/features/vocabulary/utils/constants";
import {
	getNextPageParam,
	useVocabSearch,
	vocabSearchParams,
} from "@user/features/vocabulary/utils/helpers";
import { GooeyInput } from "@shared/components/ui/gooey-input";
import { Button } from "@shared/components/ui/button";

const VocabDeckCreateDialog = lazy(() =>
	import("@user/features/vocabulary/components/deck-create-dialog").then(
		(m) => ({ default: m.VocabDeckCreateDialog }),
	),
);
/**
 * Trang nội dung trong một thư mục: breadcrumb + danh sách học phần.
 */
export function VocabularyFolder() {
	const { folderId } = useParams<{ folderId: string }>();
	const [createOpen, setCreateOpen] = useState(false);
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const { searchInput, setSearchInput, deferredSearch } = useVocabSearch();

	const folderQuery = useQuery({
		queryKey: ["folder", "detail", folderId],
		queryFn: () => fetchFolderDetail(folderId!),
		enabled: !!folderId,
	});

	const decksQuery = useInfiniteQuery({
		queryKey: ["deck", "list", folderId, deferredSearch],
		queryFn: ({ pageParam }) =>
			fetchDeckList({
				folderId: folderId!,
				page: pageParam,
				limit: VOCAB_PAGE_SIZE,
				...vocabSearchParams(deferredSearch),
			}),
		initialPageParam: 1,
		getNextPageParam,
		enabled: !!folderId,
		placeholderData: keepPreviousData,
	});

	const decks = decksQuery.data?.pages.flatMap((p) => p.data) ?? [];
	const isInitialLoading = folderQuery.isLoading || decksQuery.isLoading;
	const isFetchingMore = decksQuery.isFetchingNextPage;
	const hasMore = decksQuery.hasNextPage === true;

	const loadMore = useCallback(() => {
		if (isFetchingMore || !decksQuery.hasNextPage) return;
		void decksQuery.fetchNextPage();
	}, [isFetchingMore, decksQuery]);

	useEffect(() => {
		const el = loadMoreRef.current;
		if (!el || !hasMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) loadMore();
			},
			{ rootMargin: "200px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasMore, loadMore]);

	if (folderQuery.isError) {
		return <Navigate to={VOCAB_ROUTES.root} replace />;
	}

	const folderName = folderQuery.data?.data.name ?? "";

	return (
		<div className="flex flex-col gap-6">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link to={VOCAB_ROUTES.root}>Từ vựng của tôi</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>
							{folderQuery.isLoading ? (
								<Skeleton className="h-4 w-32 inline-block" />
							) : (
								folderName
							)}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<div className="flex gap-3">
				<Button variant="blackHover" onClick={() => setCreateOpen(true)}>
					<HugeiconsIcon icon={PlusSignIcon} />
					Tạo
				</Button>
				<GooeyInput
					placeholder="Tìm kiếm"
					collapsedWidth={140}
					expandedWidth={220}
					theme="light"
					value={searchInput}
					onValueChange={setSearchInput}
				/>
			</div>
			{folderId && (
				<Suspense fallback={null}>
					<VocabDeckCreateDialog
						open={createOpen}
						onOpenChange={setCreateOpen}
						folderId={folderId}
					/>
				</Suspense>
			)}
			<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-y-6 place-items-center">
				{isInitialLoading &&
					Array.from({ length: 5 }).map((_, i) => (
						<Skeleton
							key={i}
							className="w-[160px] h-[125px] lg:w-[180px] lg:h-[150px] rounded-2xl"
						/>
					))}
				{!isInitialLoading &&
					decks.map((deck) => <VocabDeck key={deck._id} deck={deck} />)}
			</div>
			{!isInitialLoading && decks.length === 0 && (
				<p className="text-sm text-muted-foreground">
					{deferredSearch ? "Không tìm thấy mục phù hợp." : "Thư mục trống."}
				</p>
			)}
			{hasMore && <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />}
			{isFetchingMore && (
				<div className="flex justify-center py-4">
					<HugeiconsIcon
						icon={Loading03Icon}
						className="size-6 animate-spin text-muted-foreground"
						strokeWidth={2}
					/>
				</div>
			)}
		</div>
	);
}
