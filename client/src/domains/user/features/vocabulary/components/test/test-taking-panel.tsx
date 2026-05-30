import { useCallback, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@shared/components/ui/button";

import { EssayQuestionCard } from "@user/features/vocabulary/components/test/essay-question";
import { MultipleChoiceQuestionCard } from "@user/features/vocabulary/components/test/multiple-choice-question";
import { TrueFalseQuestionCard } from "@user/features/vocabulary/components/test/true-false-question";
import type {
	VocabTestQuestion,
	VocabTestUserAnswer,
} from "@user/features/vocabulary/types/test";
import { ArrowUp02Icon } from "@hugeicons/core-free-icons";

type VocabTestTakingPanelProps = {
	questions: VocabTestQuestion[];
	answers: Map<string, VocabTestUserAnswer>;
	registerQuestionRef: (index: number, node: HTMLElement | null) => void;
	setAnswer: (questionId: string, answer: VocabTestUserAnswer) => void;
	clearAnswer: (questionId: string) => void;
	onSubmit: (essayDrafts: Record<string, string>) => void;
};

/**
 * Vùng làm bài gồm danh sách câu hỏi và nút nộp bài.
 * @param props.questions - Danh sách câu hỏi
 * @param props.answers - Map đáp án hiện tại
 * @param props.registerQuestionRef - Đăng ký ref scroll từng câu
 * @param props.setAnswer - Ghi đáp án
 * @param props.clearAnswer - Xóa đáp án
 * @param props.onSubmit - Nộp bài kèm draft tự luận
 */
export function VocabTestTakingPanel({
	questions,
	answers,
	registerQuestionRef,
	setAnswer,
	clearAnswer,
	onSubmit,
}: VocabTestTakingPanelProps) {
	const [essayDrafts, setEssayDrafts] = useState<Record<string, string>>({});

	const handleEssayDraftChange = useCallback(
		(questionId: string, value: string) => {
			setEssayDrafts((prev) => ({ ...prev, [questionId]: value }));
			const trimmed = value.trim();
			if (trimmed) {
				setAnswer(questionId, { type: "essay", value: trimmed });
			} else {
				clearAnswer(questionId);
			}
		},
		[clearAnswer, setAnswer],
	);

	const handleSubmit = useCallback(() => {
		onSubmit(essayDrafts);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, [essayDrafts, onSubmit]);

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-8 pb-16">
			{questions.map((question, index) => {
				const userAnswer = answers.get(question.id) ?? null;

				return (
					<div
						key={question.id}
						ref={(node) => registerQuestionRef(index, node)}
						className="scroll-mt-4"
					>
						{question.type === "tf" ? (
							<TrueFalseQuestionCard
								question={question}
								index={index}
								total={questions.length}
								mode="taking"
								userAnswer={userAnswer}
								onAnswer={(value) =>
									setAnswer(question.id, { type: "tf", value })
								}
							/>
						) : null}

						{question.type === "mc" ? (
							<MultipleChoiceQuestionCard
								question={question}
								index={index}
								total={questions.length}
								mode="taking"
								userAnswer={userAnswer}
								onAnswer={(value) =>
									setAnswer(question.id, { type: "mc", value })
								}
							/>
						) : null}

						{question.type === "essay" ? (
							<EssayQuestionCard
								question={question}
								index={index}
								total={questions.length}
								mode="taking"
								userAnswer={userAnswer}
								draftValue={
									essayDrafts[question.id] ??
									(userAnswer?.type === "essay" ? userAnswer.value : "")
								}
								onDraftChange={(value) =>
									handleEssayDraftChange(question.id, value)
								}
							/>
						) : null}
					</div>
				);
			})}

			<Button
				variant="blackHover"
				size="lg"
				className="w-full"
				onClick={handleSubmit}
			>
				<HugeiconsIcon icon={ArrowUp02Icon} className="size-4" />
				Nộp bài
			</Button>
		</div>
	);
}
