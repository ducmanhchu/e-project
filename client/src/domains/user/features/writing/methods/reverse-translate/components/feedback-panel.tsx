import { HugeiconsIcon } from "@hugeicons/react";
import { BookAIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { useCallback, useState } from "react";

import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@shared/components/ui/dialog";
import { WordCard } from "@/domains/user/features/writing/methods/reverse-translate/components/word-card";
import type { FeedbackPanelProps } from "@shared/types/reverse-translate";

export function FeedbackPanel({
	viewingFeedback,
	progress,
	vocabList,
	isVocabListLoading,
	isSubmitting,
	hasVocabulary,
}: FeedbackPanelProps) {
	const standardSuggestion = useCallback((input: string) => {
		// Remove all occurrences of **...**
		let cleaned = input.replace(/\*\*(.*?)\*\*/g, "$1");
		// Remove all parentheses () blocks, including the parenthesis and their inner content
		cleaned = cleaned.replace(/\([^)]*\)/g, "");
		// Replace multiple spaces with a single space and trim
		return cleaned.replace(/\s+/g, " ").trim();
	}, []);

	const [isSuggestionVisible, setIsSuggestionVisible] = useState(false);
	const [prevViewingIdx, setPrevViewingIdx] = useState<number | null>(null);

	if ((viewingFeedback?.idx ?? null) !== prevViewingIdx) {
		setPrevViewingIdx(viewingFeedback?.idx ?? null);
		setIsSuggestionVisible(false);
	}

	const isSuggestionMaskable = !!viewingFeedback && viewingFeedback.score < 70;
	const shouldMaskSuggestion = isSuggestionMaskable && !isSuggestionVisible;

	return (
		<div className="col-span-1 flex flex-col gap-3 lg:h-full lg:overflow-y-auto">
			<div className="flex flex-col gap-3">
				<div className="flex gap-3">
					<div className="flex items-end py-2 px-4 lg:px-5 lg:py-4 gap-4 bg-neutral-50 rounded-4xl border w-2/3">
						<p className="text-muted-foreground text-sm font-normal">
							Độ chính xác:
						</p>
						{isSubmitting ? (
							<Skeleton className="h-10 w-20 lg:h-12 lg:w-24" />
						) : (
							<p>
								<span
									className={cn(
										"text-secondary-black text-2xl font-black lg:text-5xl",
										viewingFeedback?.score && viewingFeedback.score >= 70
											? "text-green-800"
											: "text-red-800",
									)}
								>
									{viewingFeedback?.score}
								</span>
								<span className="text-secondary-black text-sm">/100</span>
							</p>
						)}
					</div>
					<Dialog>
						<DialogTrigger asChild>
							<Button
								variant="outline"
								className="w-1/3 h-full border bg-neutral-50 text-secondary-black flex lg:flex-col"
							>
								<HugeiconsIcon icon={BookAIcon} />
								<span>Từ vựng</span>
							</Button>
						</DialogTrigger>
						<DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-[min(85dvw,calc(100%-2rem))]">
							<DialogHeader className="shrink-0">
								<DialogTitle>Từ vựng</DialogTitle>
								<DialogDescription>
									Danh sách từ vựng được sử dụng trong bài tập.
								</DialogDescription>
							</DialogHeader>
							<div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
								{isVocabListLoading && (
									<div className="grid grid-cols-1 gap-3 pt-2 lg:grid-cols-2">
										{Array.from({ length: 4 }).map((_, i) => (
											<Skeleton key={i} className="h-24 w-full rounded-xl" />
										))}
									</div>
								)}
								{!isVocabListLoading && !hasVocabulary && (
									<p className="text-sm text-muted-foreground">
										Bài tập chưa có từ vựng gắn kèm.
									</p>
								)}
								{!isVocabListLoading &&
									hasVocabulary &&
									(!vocabList.length ? (
										<p className="text-sm text-muted-foreground">
											Không tải được danh sách từ vựng.
										</p>
									) : (
										<div className="grid grid-cols-1 gap-3 pt-2 lg:grid-cols-2">
											{vocabList.map((word) => (
												<WordCard key={word._id} word={word} />
											))}
										</div>
									))}
							</div>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Feedback content */}
			<div className="flex flex-col gap-4 bg-neutral-50 rounded-4xl border flex-1 px-5 py-4 overflow-y-auto no-scrollbar">
				{isSubmitting ? (
					<>
						<Skeleton className="h-4 w-28" />
						<div className="flex flex-col gap-1">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-5 w-full" />
						</div>
						<div className="flex flex-col gap-1">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-3/4" />
						</div>
						<div className="flex flex-col gap-1">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-5/6" />
						</div>
						<div className="flex flex-col gap-1">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-2/3" />
						</div>
					</>
				) : !viewingFeedback ? (
					<div className="flex flex-1 items-center justify-center">
						<p className="text-sm text-muted-foreground text-center">
							{progress.completed === 0
								? "Hãy dịch câu đầu tiên để bắt đầu."
								: "Bắt đầu dịch hoặc chọn câu đã dịch để xem nhận xét."}
						</p>
					</div>
				) : (
					<>
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground text-xs">
								Câu {viewingFeedback.idx}
							</span>
							<span className="text-muted-foreground text-xs">-</span>
							<span
								className={cn(
									"text-xs",
									viewingFeedback.score >= 70
										? "text-green-800"
										: "text-red-800",
								)}
							>
								{viewingFeedback.score >= 70 ? "Đạt yêu cầu" : "Chưa đạt"}
							</span>
						</div>

						<div className="flex flex-col gap-1">
							<p className="text-muted-foreground text-sm font-normal">
								Đáp án của bạn:
							</p>
							<p className="text-secondary-black text-base/7 font-normal text-justify">
								{viewingFeedback.userAnswer}
							</p>
						</div>
						<div className="flex flex-col gap-1">
							<div className="flex items-center gap-2">
								<p className="text-muted-foreground text-sm font-normal">
									Đáp án gợi ý:
								</p>
								{isSuggestionMaskable && (
									<button
										type="button"
										onClick={() => setIsSuggestionVisible((v) => !v)}
										className="text-muted-foreground hover:text-secondary-black transition-colors inline-flex items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-black/40"
										aria-label={
											isSuggestionVisible
												? "Ẩn đáp án gợi ý"
												: "Hiện đáp án gợi ý"
										}
										aria-pressed={isSuggestionVisible}
									>
										<HugeiconsIcon
											icon={isSuggestionVisible ? ViewOffIcon : ViewIcon}
											size={16}
										/>
									</button>
								)}
							</div>
							<p
								className={cn(
									"text-green-800 text-base/7 font-normal text-justify transition",
									shouldMaskSuggestion &&
										"blur-sm select-none pointer-events-none",
								)}
								aria-hidden={shouldMaskSuggestion}
							>
								{standardSuggestion(viewingFeedback.feedback.suggestion)}
							</p>
						</div>
						{viewingFeedback.feedback.improvements.length > 0 && (
							<div className="flex flex-col gap-1">
								<p className="text-muted-foreground text-sm font-normal">
									Cần cải thiện:
								</p>
								<ul className="list-disc list-inside">
									{viewingFeedback.feedback.improvements.map((item, idx) => (
										<li
											key={idx}
											className="text-secondary-black text-base/7 font-normal mb-4 text-justify"
										>
											{item}
										</li>
									))}
								</ul>
							</div>
						)}
						<div className="flex flex-col gap-1">
							<p className="text-muted-foreground text-sm font-normal">
								Nhận xét:
							</p>
							<p className="text-secondary-black text-base/7 font-normal text-justify">
								{viewingFeedback.feedback.comment}
							</p>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
