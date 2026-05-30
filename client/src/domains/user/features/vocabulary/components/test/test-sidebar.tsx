import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";

import {
	VOCAB_QUESTION_TYPE_LABELS,
	VOCAB_QUESTION_TYPE_ORDER,
	type VocabQuestionResult,
	type VocabQuestionResultStatus,
	type VocabQuestionType,
	type VocabTestQuestion,
} from "@user/features/vocabulary/types/test";

type VocabTestSidebarProps = {
	questions: VocabTestQuestion[];
	results?: VocabQuestionResult[];
	onSelectQuestion: (index: number) => void;
	isResult?: boolean;
};

/**
 * Sidebar điều hướng câu hỏi theo nhóm loại.
 * @param props.questions - Danh sách câu hỏi
 * @param props.results - Kết quả từng câu (màn review)
 * @param props.onSelectQuestion - Chọn câu theo index
 * @param props.isResult - Đang ở màn kết quả
 */
export function VocabTestSidebar({
	questions,
	results,
	onSelectQuestion,
	isResult = false,
}: VocabTestSidebarProps) {
	const grouped = VOCAB_QUESTION_TYPE_ORDER.map((type) => ({
		type,
		items: questions
			.map((question, index) => ({ question, index }))
			.filter(({ question }) => question.type === type),
	})).filter((group) => group.items.length > 0);

	const getStatus = (index: number): VocabQuestionResultStatus | null => {
		if (!isResult || !results) return null;
		return results[index]?.status ?? null;
	};

	return (
		<aside className="border bg-neutral-50 rounded-2xl flex flex-col gap-6 place-content-center p-4 w-full">
			{grouped.map(({ type, items }) => (
				<div key={type} className="flex flex-col gap-3">
					<p className="text-xs font-medium self-center">
						{VOCAB_QUESTION_TYPE_LABELS[type as VocabQuestionType]}
					</p>
					<div className="flex gap-1 justify-evenly items-center flex-wrap">
						{items.map(({ index }) => {
							const status = getStatus(index);

							return (
								<Button
									variant="outline"
									size="icon"
									key={questions[index]?.id ?? index}
									onClick={() => onSelectQuestion(index)}
								>
									{isResult && status === "correct" ? (
										<HugeiconsIcon
											icon={CheckmarkCircle02Icon}
											className="size-4 text-green-600"
										/>
									) : isResult && status !== "correct" ? (
										<HugeiconsIcon
											icon={Cancel01Icon}
											className="size-4 text-red-600"
										/>
									) : (
										index + 1
									)}
								</Button>
							);
						})}
					</div>
				</div>
			))}
		</aside>
	);
}
