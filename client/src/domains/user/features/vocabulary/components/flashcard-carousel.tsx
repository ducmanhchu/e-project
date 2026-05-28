import { useState, useEffect, useCallback, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

import type { Flashcard } from "@shared/types/vocab";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	type CarouselApi,
} from "@shared/components/ui/carousel";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { FlashCard } from "@user/features/vocabulary/components/flash-card";

type FlashcardCarouselProps = {
	flashcards: Flashcard[];
	totalCards: number;
	shuffled: boolean;
	onPrefetchNearEnd: (index: number) => void;
};

/**
 * Carousel ôn flashcard — state vuốt/lật tách khỏi page để header/footer không re-render.
 * @param props.flashcards — danh sách thẻ đã flatten từ infinite query
 * @param props.totalCards — tổng số thẻ từ pagination
 * @param props.shuffled — khi đổi, reset vị trí carousel về thẻ đầu
 * @param props.onPrefetchNearEnd — gọi khi gần cuối danh sách để tải trang kế
 * @returns JSX.Element
 */
export function FlashcardCarousel({
	flashcards,
	totalCards,
	shuffled,
	onPrefetchNearEnd,
}: FlashcardCarouselProps) {
	const [api, setApi] = useState<CarouselApi>();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
	const [trackProgress, setTrackProgress] = useState(false);
	const carouselRef = useRef<HTMLDivElement>(null);

	const current = selectedIndex + 1;

	const onPrefetchNearEndRef = useRef(onPrefetchNearEnd);
	useEffect(() => {
		onPrefetchNearEndRef.current = onPrefetchNearEnd;
	});

	useEffect(() => {
		if (!api) return;

		const handleSelect = () => {
			const index = api.selectedScrollSnap();
			setSelectedIndex((prev) => {
				if (prev !== index) setFlippedCardId(null);
				return index;
			});
			onPrefetchNearEndRef.current(index);
		};

		handleSelect();

		api.on("select", handleSelect);

		return () => {
			api.off("select", handleSelect);
		};
	}, [api]);

	useEffect(() => {
		api?.scrollTo(0);
		// eslint-disable-next-line
		setSelectedIndex(0);
		setFlippedCardId(null);
	}, [shuffled, api]);

	useEffect(() => {
		if (flashcards.length === 0 || !api) return;

		const frameId = requestAnimationFrame(() => {
			carouselRef.current?.focus({ preventScroll: true });
		});

		return () => cancelAnimationFrame(frameId);
	}, [api, flashcards.length]);

	const toggleActiveFlashcard = useCallback(() => {
		const index = api?.selectedScrollSnap() ?? selectedIndex;
		const activeCardId = flashcards[index]?._id;
		if (!activeCardId) return;
		setFlippedCardId((prev) => (prev === activeCardId ? null : activeCardId));
	}, [api, flashcards, selectedIndex]);

	const handleTrackProgress = useCallback(() => {
		setTrackProgress((prev) => !prev);
	}, []);

	return (
		<>
			<Carousel
				ref={carouselRef}
				opts={{ watchDrag: false, loop: true }}
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
								isFlipped={
									index === selectedIndex && flippedCardId === flashcard._id
								}
								onToggleFlip={toggleActiveFlashcard}
								isTrackProgress={trackProgress}
							/>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious
					variant="ghost"
					size="icon-lg"
					className="max-md:left-2"
				/>
				<CarouselNext
					variant="ghost"
					size="icon-lg"
					className="max-md:right-2"
				/>
			</Carousel>
			<div className="flex flex-col gap-4 md:gap-0 md:flex-row md:justify-between items-center w-full max-w-4xl">
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
				{trackProgress ? (
					<div className="flex items-center gap-2">
						<Button variant="outline" className="bg-neutral-50">
							<HugeiconsIcon icon={Cancel01Icon} className="text-destructive" />
							Đang học
						</Button>
						<Button variant="outline" className="bg-neutral-50">
							<HugeiconsIcon icon={Tick02Icon} className="text-green-800" />
							Thành thạo
						</Button>
					</div>
				) : null}
			</div>
		</>
	);
}
