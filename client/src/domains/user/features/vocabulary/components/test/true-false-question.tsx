import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";

import { TermSpeaker } from "@user/features/vocabulary/components/test/term-speaker";
import type {
	TrueFalseQuestion,
	VocabQuestionResultStatus,
	VocabTestUserAnswer,
} from "@user/features/vocabulary/types/test";
import { getCardFace } from "@user/features/vocabulary/utils/test";

type TrueFalseQuestionCardProps = {
	question: TrueFalseQuestion;
	index: number;
	total: number;
	mode: "taking" | "review";
	userAnswer?: VocabTestUserAnswer | null;
	status?: VocabQuestionResultStatus;
	onAnswer?: (value: boolean) => void;
};

/**
 * Thẻ câu hỏi dạng Đúng/Sai.
 * @param props.question - Dữ liệu câu hỏi
 * @param props.index - Thứ tự câu (0-based)
 * @param props.total - Tổng số câu
 * @param props.mode - Chế độ làm bài hoặc xem kết quả
 * @param props.userAnswer - Đáp án người dùng
 * @param props.status - Trạng thái chấm
 * @param props.onAnswer - Callback chọn Đúng/Sai
 */
export function TrueFalseQuestionCard({
	question,
	index,
	total,
	mode,
	userAnswer,
	status,
	onAnswer,
}: TrueFalseQuestionCardProps) {
	const selected = userAnswer?.type === "tf" ? userAnswer.value : undefined;
	const showReview = mode === "review";
	const isIncorrect = showReview && status === "incorrect";
	const isSkipped = showReview && status === "skipped";

	return (
		<article className="relative overflow-hidden rounded-2xl bg-neutral-50 border">
			<span className="absolute top-4 right-4 text-xs text-muted-foreground">
				{index + 1}/{total}
			</span>
			<div className="grid grid-cols-1 md:grid-cols-2">
				<div className="flex flex-col gap-3 p-6">
					<p className="text-xs text-muted-foreground py-2">Định nghĩa</p>
					<p className="text-lg">{question.definitionText}</p>
				</div>
				<div className="flex flex-col gap-3 p-6">
					<div className="flex items-center gap-1">
						<p className="text-xs text-muted-foreground">Thuật ngữ</p>
						<TermSpeaker word={question.termText} />
					</div>
					<p className="text-lg">{question.termText}</p>
				</div>
			</div>

			<div className="p-6">
				{showReview && isIncorrect ? (
					<p className="mb-4 text-xs text-red-600">
						Chưa đúng, hãy cố gắng nhé!
					</p>
				) : null}
				{showReview && status === "correct" ? (
					<p className="mb-4 text-xs text-green-600">
						Đúng rồi, bạn làm tốt lắm!
					</p>
				) : null}
				{showReview && isSkipped ? (
					<p className="mb-4 text-xs text-muted-foreground">
						Bạn đã bỏ qua câu hỏi này!
					</p>
				) : null}

				{!showReview && (
					<p className="mb-4 text-xs text-muted-foreground">Chọn câu trả lời</p>
				)}

				<div className="grid grid-cols-2 gap-3">
					{([true, false] as const).map((value) => {
						const label = value ? "Đúng" : "Sai";
						const isSelected = selected === value;
						const isWrongChoice =
							showReview && isSelected && status === "incorrect";

						return (
							<Button
								key={label}
								variant="outline"
								disabled={showReview}
								className={cn(
									"font-normal",
									isSelected && "border-primary",
									showReview &&
										isSelected &&
										status === "correct" &&
										"border-green-600",
									isWrongChoice && "border-red-600 text-red-600",
									showReview && selected !== undefined && !isSelected,
								)}
								onClick={() => onAnswer?.(value)}
							>
								{isWrongChoice ? (
									<span className="flex items-center gap-2">
										<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
										{label}
									</span>
								) : (
									label
								)}
							</Button>
						);
					})}
				</div>

				{showReview && status !== "correct" ? (
					<div className="mt-6 flex flex-col gap-2">
						<p className="text-xs text-muted-foreground">Định nghĩa đúng</p>
						<div className="flex items-center gap-2 rounded-full border border-dashed border-green-600 px-4 py-3 text-sm">
							<HugeiconsIcon
								icon={CheckmarkCircle02Icon}
								className="size-5 shrink-0 text-green-600"
							/>
							<span>
								{getCardFace(question.card, question.direction, "answer")}
							</span>
						</div>
					</div>
				) : null}
			</div>
		</article>
	);
}
