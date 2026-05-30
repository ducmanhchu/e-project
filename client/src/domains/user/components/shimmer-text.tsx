import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@shared/lib/utils";
import { ShimmeringText } from "@shared/components/ui/shimmering-text";

const DEFAULT_PHRASES = [
	"Đang thực hiện đánh giá...",
	"Đang phân tích bài làm...",
	"Đang tạo câu trả lời...",
	"Sắp hoàn thành rồi...",
] as const;

type ShimmerTextProps = {
	phrases?: readonly string[];
	intervalMs?: number;
	className?: string;
	textClassName?: string;
};

export function ShimmerText({
	phrases = DEFAULT_PHRASES,
	intervalMs = 3000,
	className,
	textClassName,
}: ShimmerTextProps) {
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		if (phrases.length <= 1) return;

		const interval = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % phrases.length);
		}, intervalMs);

		return () => clearInterval(interval);
	}, [phrases, intervalMs]);

	return (
		<div className={cn("flex items-center justify-center min-h-12", className)}>
			<AnimatePresence mode="wait">
				<motion.div
					key={currentIndex}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					transition={{ duration: 0.3 }}
				>
					<ShimmeringText
						text={phrases[currentIndex]}
						className={cn("text-sm", textClassName)}
						startOnView={false}
						repeat
					/>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
