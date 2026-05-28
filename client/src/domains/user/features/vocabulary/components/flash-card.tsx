import { type MouseEvent } from "react";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, VolumeHighIcon } from "@hugeicons/core-free-icons";

import type { Flashcard } from "@shared/types/vocab";
import { VocabBadge } from "@user/features/vocabulary/components/vocab-badge";
import { Button } from "@shared/components/ui/button";
import { useAzureTTS } from "@shared/hooks/use-azure-tts";
import { translatePartOfSpeech } from "@shared/lib/utils";
import { cn } from "@shared/lib/utils";

/**
 * Thẻ học hỗ trợ lật 2 mặt để giảm quá tải nhận thức khi ôn từ.
 * @param props.flashcard — dữ liệu từ vựng hiện tại
 * @returns JSX.Element
 */
type FlashCardProps = {
	flashcard: Flashcard;
	isActive: boolean;
	isFlipped: boolean;
	isTrackProgress: boolean;
	onToggleFlip: () => void;
};

export function FlashCard({
	flashcard,
	isActive,
	isFlipped,
	isTrackProgress,
	onToggleFlip,
}: FlashCardProps) {
	const { isPlaying, toggle } = useAzureTTS();

	const handleFlip = () => {
		if (!isActive) return;
		onToggleFlip();
	};

	const handlePlayAudio = (event: MouseEvent<HTMLButtonElement>) => {
		// Ngăn thao tác phát âm vô tình kích hoạt hành vi lật thẻ.
		event.stopPropagation();
		void toggle(flashcard.word);
	};

	return (
		<div className="w-full perspective-[1600px]">
			<motion.div
				animate={{ rotateX: isFlipped ? 180 : 0 }}
				transition={{ duration: 0.5, ease: "easeInOut" }}
				className="relative h-[min(62vh,520px)] w-full cursor-pointer transform-3d"
				onClick={handleFlip}
			>
				<div
					className="absolute inset-0 rounded-2xl border bg-card p-5 backface-hidden"
					style={{ backfaceVisibility: "hidden" }}
				>
					<div className="flex h-full flex-col">
						<div
							className={cn(
								"flex items-start",
								isTrackProgress ? "justify-between" : "justify-end",
							)}
						>
							{isTrackProgress && <VocabBadge status={flashcard.status} />}

							<div className="flex gap-2 items-center">
								{flashcard.partOfSpeech ? (
									<span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
										{translatePartOfSpeech(flashcard.partOfSpeech)}
									</span>
								) : null}
								<Button
									type="button"
									size="icon-sm"
									variant="ghost"
									aria-label={`Phát âm ${flashcard.word}`}
									onClick={handlePlayAudio}
								>
									<HugeiconsIcon
										icon={isPlaying ? PauseIcon : VolumeHighIcon}
										className="size-4"
									/>
								</Button>
							</div>
						</div>

						<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
							<p className="text-2xl font-medium tracking-tight md:text-4xl">
								{flashcard.word}
							</p>
							<p className="text-base text-muted-foreground">
								{flashcard.ipa ? `/${flashcard.ipa}/` : ""}
							</p>
						</div>
					</div>
				</div>

				<div
					className="absolute inset-0 rounded-2xl border bg-card p-5 shadow-sm backface-hidden"
					style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
				>
					<div className="flex h-full flex-col justify-center gap-4 text-center">
						<p className="text-2xl font-medium md:text-4xl">
							{flashcard.meaning}
						</p>
						<p className="text-base text-muted-foreground">
							{flashcard.enExample ? flashcard.enExample : ""}
						</p>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
