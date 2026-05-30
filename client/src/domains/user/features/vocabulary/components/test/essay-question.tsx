import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { Input } from "@shared/components/ui/input";
import { cn } from "@shared/lib/utils";

import type {
	EssayQuestion,
	VocabQuestionResultStatus,
	VocabTestUserAnswer,
} from "@user/features/vocabulary/types/test";

type EssayQuestionCardProps = {
	question: EssayQuestion;
	index: number;
	total: number;
	mode: "taking" | "review";
	userAnswer?: VocabTestUserAnswer | null;
	status?: VocabQuestionResultStatus;
	draftValue?: string;
	onDraftChange?: (value: string) => void;
};

/**
 * Thẻ câu hỏi tự luận với ô nhập đáp án.
 * @param props.question - Dữ liệu câu hỏi
 * @param props.index - Thứ tự câu
 * @param props.total - Tổng số câu
 * @param props.mode - Chế độ làm bài hoặc review
 * @param props.userAnswer - Đáp án đã nộp
 * @param props.status - Trạng thái chấm
 * @param props.draftValue - Giá trị đang gõ
 * @param props.onDraftChange - Cập nhật draft
 */
export function EssayQuestionCard({
	question,
	index,
	total,
	mode,
	userAnswer,
	status,
	draftValue = "",
	onDraftChange,
}: EssayQuestionCardProps) {
	const showReview = mode === "review";
	const submitted = userAnswer?.type === "essay" ? userAnswer.value.trim() : "";
	const placeholder =
		question.direction === "en" ? "Nhập Tiếng Anh" : "Nhập Tiếng Việt";
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
				{isSkipped ? (
					<p className="mb-4 text-xs text-muted-foreground">
						Bạn đã bỏ qua câu hỏi này!
					</p>
				) : null}
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

				{!showReview && (
					<p className="mb-4 text-xs text-muted-foreground">Đáp án của bạn</p>
				)}

				{showReview ? (
					<div
						className={cn(
							"flex items-center gap-2 rounded-full border px-4 py-3 text-sm",
							status === "skipped"
								? "border-border text-muted-foreground"
								: status === "incorrect"
									? "border-red-600 text-red-600"
									: "border-green-600 text-green-600",
						)}
					>
						{status === "skipped" ? (
							<>
								<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
								<span>Đã bỏ qua</span>
							</>
						) : (
							submitted || "—"
						)}
					</div>
				) : (
					<div className="flex flex-col gap-2">
						<p className="text-xs text-muted-foreground">Đáp án của bạn</p>
						<Input
							value={draftValue}
							onChange={(event) => onDraftChange?.(event.target.value)}
							placeholder={placeholder}
							className="bg-muted"
							autoComplete="off"
						/>
					</div>
				)}

				{showReview && !isCorrect ? (
					<div className="mt-8 mb-4 flex flex-col gap-2">
						<p className="text-xs text-green-600">Đáp án đúng</p>
						<div className="flex items-center gap-2 rounded-full border border-dashed border-green-600 px-4 py-3 text-sm">
							<HugeiconsIcon
								icon={CheckmarkCircle02Icon}
								className="size-5 shrink-0 text-green-600"
							/>
							<span>{question.correctAnswer}</span>
						</div>
					</div>
				) : null}
			</div>
		</article>
	);
}
