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
} from "@hugeicons/core-free-icons";

import {
	keepPreviousData,
	useInfiniteQuery,
	useQuery,
} from "@tanstack/react-query";
import { fetchDeckDetail, fetchFlashcardList } from "@shared/api/vocab";

import {
	FLASHCARD_PAGE_SIZE,
	FLASHCARD_PREFETCH_THRESHOLD,
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
import { FlashcardCarousel } from "@/domains/user/features/vocabulary/components/flashcard-carousel";

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

export function VocabularyDeck() {
	const navigate = useNavigate();

	const { deckId } = useParams<{ deckId: string }>();

	const [updateOpen, setUpdateOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [shuffled, setShuffled] = useState(false);

	const deckQuery = useQuery({
		queryKey: ["deck", "detail", deckId],
		queryFn: () => fetchDeckDetail(deckId as string),
		enabled: !!deckId,
	});

	const flashcardsQuery = useInfiniteQuery({
		queryKey: ["flashcards", "list", deckId, shuffled],
		queryFn: ({ pageParam }) =>
			fetchFlashcardList({
				deckId: deckId as string,
				page: pageParam,
				limit: FLASHCARD_PAGE_SIZE,
				shuffle: shuffled,
			}),
		initialPageParam: 1,
		getNextPageParam,
		enabled: !!deckId,
		placeholderData: keepPreviousData,
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
		navigate(-1);
	};

	const handleShuffleToggle = useCallback((pressed: boolean) => {
		startTransition(() => {
			setShuffled(pressed);
		});
	}, []);

	return (
		<div className="flex min-h-[calc(100svh-6.5rem)] flex-col gap-6">
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
					<p className="text-2xl font-bold">{deckQuery.data?.data?.name}</p>
				)}

				<div className="flex items-center">
					{}
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
				) : flashcards.length > 0 ? (
					<FlashcardCarousel
						flashcards={flashcards}
						totalCards={totalCards}
						shuffled={shuffled}
						onPrefetchNearEnd={prefetchIfNearEnd}
					/>
				) : (
					<p className="text-muted-foreground text-sm self-center">
						Học phần trống
					</p>
				)}
			</div>

			<div className="flex justify-between items-center">
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
					<Button variant="blackHover">
						<HugeiconsIcon icon={TaskDaily01Icon} />
						Kiểm tra
					</Button>
				) : null}
			</div>

			{updateOpen || deleteOpen ? (
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
				</Suspense>
			) : null}
		</div>
	);
}
