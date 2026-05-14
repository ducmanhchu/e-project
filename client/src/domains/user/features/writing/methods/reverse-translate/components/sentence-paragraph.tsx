import { cn } from "@shared/lib/utils";
import { Skeleton } from "@shared/components/ui/skeleton";
import type { SentenceParagraphProps } from "@shared/types/reverse-translate";

export function SentenceParagraph({
	sentences,
	currentSentenceIdx,
	viewingSentenceIdx,
	onSentenceClick,
	isLoading,
}: SentenceParagraphProps) {
	if (isLoading) {
		return (
			<div className="flex flex-col gap-3 lg:pe-5">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-11/12" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
			</div>
		);
	}

	return (
		<p className="indent-8 text-base/9 lg:pe-5">
			{sentences.map((sentence) => {
				const isActive = sentence.order === currentSentenceIdx;
				const isDone = sentence.isCompleted;
				const isViewing = sentence.order === viewingSentenceIdx;
				const isPending = !isDone && !isActive;

				return (
					<span
						key={sentence.order}
						role={isDone ? "button" : undefined}
						tabIndex={isDone ? 0 : undefined}
						onClick={() => isDone && onSentenceClick(sentence.order)}
						onKeyDown={(e) => {
							if (isDone && (e.key === "Enter" || e.key === " ")) {
								e.preventDefault();
								onSentenceClick(sentence.order);
							}
						}}
						className={cn(
							"transition-all duration-300 rounded px-0.5",
							isActive && "bg-yellow-100 font-semibold text-secondary-black",
							isDone &&
								!isViewing &&
								"font-medium text-secondary-black cursor-pointer hover:bg-neutral-100",
							isDone &&
								isViewing &&
								"font-medium text-secondary-black bg-neutral-200 cursor-pointer",
							isPending && "text-muted-foreground font-normal",
						)}
					>
						{sentence.vietnameseText}{" "}
					</span>
				);
			})}
		</p>
	);
}
