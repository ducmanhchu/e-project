import {
	useCallback,
	useEffect,
	useRef,
	useState,
	lazy,
	Suspense,
} from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

import { fetchFolderList, fetchDeckList } from "@shared/api/vocab";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Button } from "@shared/components/ui/button";
import { GooeyInput } from "@shared/components/ui/gooey-input";

import { VocabFolder } from "@user/features/vocabulary/components/folder";
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

const VocabCreateDialog = lazy(() =>
	import("@user/features/vocabulary/components/create-dialog").then((m) => ({
		default: m.VocabCreateDialog,
	})),
);

/**
 * Trang kho gốc: danh sách thư mục và học phần không thuộc folder.
 */
export function Vocabulary() {
	const [createOpen, setCreateOpen] = useState(false);
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const { searchInput, setSearchInput, deferredSearch } = useVocabSearch();

	const foldersQuery = useInfiniteQuery({
		queryKey: ["folder", "list", deferredSearch],
		queryFn: ({ pageParam }) =>
			fetchFolderList({
				page: pageParam,
				limit: VOCAB_PAGE_SIZE,
				...vocabSearchParams(deferredSearch),
			}),
		initialPageParam: 1,
		getNextPageParam,
		placeholderData: keepPreviousData,
	});

	const decksQuery = useInfiniteQuery({
		queryKey: ["deck", "list", "root", deferredSearch],
		queryFn: ({ pageParam }) =>
			fetchDeckList({
				folderId: "null",
				page: pageParam,
				limit: VOCAB_PAGE_SIZE,
				...vocabSearchParams(deferredSearch),
			}),
		initialPageParam: 1,
		getNextPageParam,
		placeholderData: keepPreviousData,
	});

	const folders = foldersQuery.data?.pages.flatMap((p) => p.data) ?? [];
	const decks = decksQuery.data?.pages.flatMap((p) => p.data) ?? [];
	const isInitialLoading = foldersQuery.isLoading || decksQuery.isLoading;
	const isFetchingMore =
		foldersQuery.isFetchingNextPage || decksQuery.isFetchingNextPage;
	const hasMore =
		foldersQuery.hasNextPage === true || decksQuery.hasNextPage === true;
	const isEmpty =
		!isInitialLoading && folders.length === 0 && decks.length === 0;

	const loadMore = useCallback(() => {
		if (isFetchingMore) return;
		if (foldersQuery.hasNextPage) {
			void foldersQuery.fetchNextPage();
			return;
		}
		if (decksQuery.hasNextPage) {
			void decksQuery.fetchNextPage();
		}
	}, [isFetchingMore, foldersQuery, decksQuery]);

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

	return (
		<div className="grid grid-cols-1 gap-10 md:gap-6 md:grid-cols-4">
			<div className="md:col-span-3 flex flex-col gap-12">
				<div className="flex flex-col gap-8">
					<div className="flex flex-col gap-4">
						<h1 className="text-4xl font-extrabold">Từ vựng của tôi</h1>
						<p className="text-base">
							Tạo và quản lý các thư mục và học phần từ vựng của riêng bạn.
						</p>
					</div>
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
					{createOpen && (
						<Suspense fallback={null}>
							<VocabCreateDialog
								open={createOpen}
								onOpenChange={setCreateOpen}
							/>
						</Suspense>
					)}
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-6 place-items-center">
						{isInitialLoading &&
							Array.from({ length: 5 }).map((_, i) => (
								<Skeleton
									key={i}
									className="w-[160px] h-[125px] lg:w-[180px] lg:h-[150px] rounded-2xl"
								/>
							))}
						{!isInitialLoading && !isEmpty && (
							<>
								{folders.map((folder) => (
									<VocabFolder
										key={folder._id}
										folderId={folder._id}
										to={VOCAB_ROUTES.folder(folder._id)}
										folderName={folder.name}
										cardNumber={folder.deckCount ?? 0}
									/>
								))}
								{decks.map((deck) => (
									<VocabDeck
										key={deck._id}
										deck={deck}
										to={VOCAB_ROUTES.deck(deck._id)}
									/>
								))}
							</>
						)}
						{isEmpty && (
							<p className="text-sm text-muted-foreground place-self-start">
								{deferredSearch
									? "Không tìm thấy mục phù hợp."
									: "Kho từ vựng trống."}
							</p>
						)}
					</div>
					{hasMore && (
						<div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
					)}
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
			</div>
			<div className="flex flex-col gap-4 order-first md:order-last">
				{/* <div className="flex border border-primary rounded-4xl p-4">
					<p className="text-lg font-bold">Nối từ</p>
				</div> */}
			</div>
		</div>
	);
}
