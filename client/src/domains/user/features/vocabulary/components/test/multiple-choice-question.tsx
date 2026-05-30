import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";
import { cn } from "@shared/lib/utils";

import type {
	MultipleChoiceQuestion,
	VocabQuestionResultStatus,
	VocabTestUserAnswer,
} from "@user/features/vocabulary/types/test";

type MultipleChoiceQuestionCardProps = {
	question: MultipleChoiceQuestion;
	index: number;
	total: number;
	mode: "taking" | "review";
	userAnswer?: VocabTestUserAnswer | null;
	status?: VocabQuestionResultStatus;
	onAnswer?: (value: string) => void;
};

/**
 * Thẻ câu hỏi trắc nghiệm 4 lựa chọn.
 * @param props.question - Dữ liệu câu hỏi
 * @param props.index - Thứ tự câu
 * @param props.total - Tổng số câu
 * @param props.mode - Chế độ làm bài hoặc review
 * @param props.userAnswer - Đáp án người dùng
 * @param props.status - Trạng thái chấm
 * @param props.onAnswer - Callback chọn đáp án
 */
export function MultipleChoiceQuestionCard({
	question,
	index,
	total,
	mode,
	userAnswer,
	status,
	onAnswer,
}: MultipleChoiceQuestionCardProps) {
	const selected = userAnswer?.type === "mc" ? userAnswer.value : undefined;
	const showReview = mode === "review";
	const isCorrect = showReview && status === "correct";
	const isIncorrect = showReview && status === "incorrect";
	const isSkipped = showReview && status === "skipped";

	return (
		<article className="relative overflow-hidden rounded-2xl border bg-neutral-50">
			<span className="absolute top-4 right-4 text-xs text-muted-foreground">
				{index + 1}/{total}
			</span>

			<div className="flex flex-col gap-3 p-6">
				<p className="text-xs text-muted-foreground">Định nghĩa</p>
				<p className="text-lg">{question.prompt}</p>
			</div>

			<div className="p-6">
				{isIncorrect ? (
					<p className="mb-4 text-xs text-red-600">
						Chưa đúng, hãy cố gắng nhé!
					</p>
				) : null}

				{isCorrect ? (
					<p className="mb-4 text-xs text-green-600">
						Đúng rồi, bạn làm tốt lắm!
					</p>
				) : null}

				{isSkipped ? (
					<p className="mb-4 text-xs text-muted-foreground">
						Bạn đã bỏ qua câu hỏi này!
					</p>
				) : null}

				{!showReview && (
					<p className="mb-4 text-xs text-muted-foreground">Chọn đáp án đúng</p>
				)}

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{question.options.map((option) => {
						const isSelected = selected === option;
						const isCorrectOption = option === question.correctOption;
						const isWrongSelection =
							showReview && isSelected && status === "incorrect";
						const showCorrectHighlight =
							showReview && isCorrectOption && status !== "correct";

						return (
							<Button
								key={option}
								variant="outline"
								disabled={showReview}
								className={cn(
									"rounded-full font-normal",
									isSelected && "border-primary",
									showReview && isSelected && isCorrect && "border-green-600",
									isWrongSelection && "border-red-600 text-red-600",
									showCorrectHighlight && "border-dashed border-green-600",
								)}
								onClick={() => onAnswer?.(option)}
							>
								<span className="flex items-center gap-2 text-left">
									{isWrongSelection ? (
										<HugeiconsIcon
											icon={Cancel01Icon}
											className="size-4 shrink-0"
										/>
									) : null}
									{showCorrectHighlight ? (
										<HugeiconsIcon
											icon={CheckmarkCircle02Icon}
											className="size-4 shrink-0 text-green-600"
										/>
									) : null}
									{option}
								</span>
							</Button>
						);
					})}
				</div>
			</div>
		</article>
	);
}
