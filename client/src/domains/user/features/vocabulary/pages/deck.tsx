import { useNavigate, useParams } from "react-router";
import {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
	lazy,
	Suspense,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowLeft02Icon,
	Edit03Icon,
	Delete01Icon,
	TaskDaily01Icon,
	Tick02Icon,
	Cancel01Icon,
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
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	type CarouselApi,
} from "@shared/components/ui/carousel";
import { Label } from "@shared/components/ui/label";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Switch } from "@shared/components/ui/switch";
import { Toggle } from "@shared/components/ui/toggle";
import { FlashCard } from "@user/features/vocabulary/components/flash-card";

/** Skeleton khớp kích thước FlashCard khi đang tải danh sách thẻ. */
function FlashCardSkeleton() {
	return (
		<div className="w-full max-w-4xl space-y-4">
			<Skeleton className="h-[min(62vh,520px)] w-full rounded-2xl" />
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
	const [api, setApi] = useState<CarouselApi>();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
	const [current, setCurrent] = useState(0);
	const [updateOpen, setUpdateOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [trackProgress, setTrackProgress] = useState(false);
	const [shuffled, setShuffled] = useState(false);
	const carouselRef = useRef<HTMLDivElement>(null);

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
			if (flashcardsQuery.isFetchingNextPage || !flashcardsQuery.hasNextPage)
				return;
			if (index >= flashcards.length - FLASHCARD_PREFETCH_THRESHOLD) {
				void flashcardsQuery.fetchNextPage();
			}
		},
		[flashcards.length, flashcardsQuery],
	);

	// Tránh đưa prefetchIfNearEnd vào deps của effect carousel — query object đổi mỗi render
	// khiến handleSelect chạy lại liên tục và xóa flippedCardId ngay sau khi click lật thẻ.
	const prefetchIfNearEndRef = useRef(prefetchIfNearEnd);
	useEffect(() => {
		prefetchIfNearEndRef.current = prefetchIfNearEnd;
	});

	useEffect(() => {
		if (!api) return;

		const handleSelect = () => {
			const index = api.selectedScrollSnap();
			setSelectedIndex((prev) => {
				if (prev !== index) setFlippedCardId(null);
				return index;
			});
			setCurrent(index + 1);
			prefetchIfNearEndRef.current(index);
		};

		handleSelect();

		api.on("select", handleSelect);

		return () => {
			api.off("select", handleSelect);
		};
	}, [api]);

	// Carousel mount sau skeleton nên cần focus thủ công để phím ←/→ hoạt động ngay.
	useEffect(() => {
		if (showFlashcardSkeleton || flashcards.length === 0 || !api) return;

		const frameId = requestAnimationFrame(() => {
			carouselRef.current?.focus({ preventScroll: true });
		});

		return () => cancelAnimationFrame(frameId);
	}, [api, showFlashcardSkeleton, flashcards.length]);

	const handleBack = (): void => {
		navigate(-1);
	};

	const toggleActiveFlashcard = useCallback(() => {
		const index = api?.selectedScrollSnap() ?? selectedIndex;
		const activeCardId = flashcards[index]?._id;
		if (!activeCardId) return;
		setFlippedCardId((prev) => (prev === activeCardId ? null : activeCardId));
	}, [api, flashcards, selectedIndex]);

	const handleTrackProgress = useCallback(() => {
		setTrackProgress((prev) => !prev);
	}, []);

	const handleShuffleToggle = useCallback(
		(pressed: boolean) => {
			setShuffled(pressed);
			api?.scrollTo(0);
			setSelectedIndex(0);
			setFlippedCardId(null);
			setCurrent(1);
		},
		[api],
	);

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
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								pressed={shuffled}
								onPressedChange={handleShuffleToggle}
								disabled={flashcardsQuery.isFetching}
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
					<>
						<Carousel
							ref={carouselRef}
							opts={{ watchDrag: false }}
							setApi={setApi}
							tabIndex={0}
							className="w-full max-w-4xl focus:outline-none"
						>
							<CarouselContent>
								{flashcards.map((flashcard, index) => (
									<CarouselItem key={flashcard._id}>
										<FlashCard
											flashcard={flashcard}
											isActive={index === selectedIndex}
											isFlipped={flippedCardId === flashcard._id}
											onToggleFlip={toggleActiveFlashcard}
											isTrackProgress={trackProgress}
										/>
									</CarouselItem>
								))}
							</CarouselContent>
							<CarouselPrevious variant="ghost" size="icon-lg" className="" />
							<CarouselNext variant="ghost" size="icon-lg" className="" />
						</Carousel>
						<div className="flex justify-between items-center w-full max-w-4xl">
							<div className="flex items-center gap-2">
								<Switch
									id="track-progress"
									checked={trackProgress}
									onCheckedChange={handleTrackProgress}
								/>
								<Label htmlFor="track-progress">Theo dõi tiến trình</Label>
							</div>
							<p
								className="self-center text-sm text-muted-foreground"
								aria-live="polite"
							>
								{current} / {totalCards}
							</p>
							{trackProgress && (
								<div className="flex items-center gap-2">
									<Button variant="outline" className="bg-neutral-50">
										<HugeiconsIcon
											icon={Cancel01Icon}
											className="text-destructive"
										/>
										Đang học
									</Button>
									<Button variant="outline" className="bg-neutral-50">
										<HugeiconsIcon
											icon={Tick02Icon}
											className="text-green-800"
										/>
										Thành thạo
									</Button>
								</div>
							)}
						</div>
					</>
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
				{!showFlashcardSkeleton && flashcards.length > 0 && (
					<Button variant="blackHover">
						<HugeiconsIcon icon={TaskDaily01Icon} />
						Kiểm tra
					</Button>
				)}
			</div>

			{(updateOpen || deleteOpen) && (
				<Suspense fallback={null}>
					{updateOpen && (
						<VocabDeckUpdateDialog
							open={updateOpen}
							onOpenChange={setUpdateOpen}
							deckId={deckId as string}
							currentName={deckQuery.data?.data?.name ?? ""}
							currentDescription={deckQuery.data?.data?.description ?? ""}
						/>
					)}
					{deleteOpen && (
						<VocabDeckDeleteDialog
							open={deleteOpen}
							onOpenChange={setDeleteOpen}
							deckId={deckId as string}
							deckName={deckQuery.data?.data?.name ?? ""}
						/>
					)}
				</Suspense>
			)}
		</div>
	);
}
