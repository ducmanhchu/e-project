import type { Flashcard } from "@shared/types/vocab";

/** Loại câu hỏi trong bài kiểm tra từ vựng. */
export type VocabQuestionType = "tf" | "mc" | "essay";

/** Ngôn ngữ mặt đáp án (mặt câu hỏi là ngược lại). */
export type VocabAnswerLanguage = "en" | "vi" | "both";

/** Cấu hình bài kiểm tra truyền qua query params. */
export type VocabTestConfig = {
	deckId: string;
	count: number;
	answerLanguage: VocabAnswerLanguage;
	questionTypes: VocabQuestionType[];
};

/** Hướng câu hỏi cho từng thẻ (en = hỏi nghĩa, trả lời từ). */
export type QuestionDirection = "en" | "vi";

type VocabQuestionBase = {
	id: string;
	index: number;
	type: VocabQuestionType;
	card: Flashcard;
	direction: QuestionDirection;
};

/** Câu Đúng/Sai: ghép meaning với word (có thể sai). */
export type TrueFalseQuestion = VocabQuestionBase & {
	type: "tf";
	definitionText: string;
	termText: string;
	isMatch: boolean;
};

/** Câu trắc nghiệm: prompt + các lựa chọn ở mặt đáp án. */
export type MultipleChoiceQuestion = VocabQuestionBase & {
	type: "mc";
	prompt: string;
	options: string[];
	correctOption: string;
};

/** Câu tự luận: prompt + đáp án chuẩn. */
export type EssayQuestion = VocabQuestionBase & {
	type: "essay";
	prompt: string;
	correctAnswer: string;
};

export type VocabTestQuestion =
	| TrueFalseQuestion
	| MultipleChoiceQuestion
	| EssayQuestion;

export type VocabTestUserAnswer =
	| { type: "tf"; value: boolean }
	| { type: "mc"; value: string }
	| { type: "essay"; value: string };

export type VocabQuestionResultStatus = "correct" | "incorrect" | "skipped";

export type VocabQuestionResult = {
	question: VocabTestQuestion;
	userAnswer: VocabTestUserAnswer | null;
	status: VocabQuestionResultStatus;
};

export type VocabTestSummary = {
	total: number;
	correct: number;
	incorrect: number;
	skipped: number;
	accuracyPercent: number;
};

export const VOCAB_QUESTION_TYPE_ORDER: VocabQuestionType[] = [
	"tf",
	"mc",
	"essay",
];

export const VOCAB_QUESTION_TYPE_LABELS: Record<VocabQuestionType, string> = {
	tf: "Đúng/Sai",
	mc: "Trắc nghiệm",
	essay: "Tự luận",
};

export const VOCAB_ANSWER_LANGUAGE_LABELS: Record<
	Exclude<VocabAnswerLanguage, "both">,
	string
> = {
	en: "Tiếng Anh",
	vi: "Tiếng Việt",
};
