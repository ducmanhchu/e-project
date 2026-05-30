import type { Flashcard } from "@shared/types/vocab";

import type {
	QuestionDirection,
	VocabAnswerLanguage,
	VocabQuestionResult,
	VocabQuestionResultStatus,
	VocabQuestionType,
	VocabTestConfig,
	VocabTestQuestion,
	VocabTestSummary,
	VocabTestUserAnswer,
} from "@user/features/vocabulary/types/test";
import { VOCAB_QUESTION_TYPE_ORDER } from "@user/features/vocabulary/types/test";

const QUESTION_TYPE_SET = new Set<string>(VOCAB_QUESTION_TYPE_ORDER);
const ANSWER_LANGUAGE_SET = new Set<string>(["en", "vi", "both"]);

/**
 * Trộn mảng bằng Fisher–Yates để phân bổ câu hỏi ngẫu nhiên.
 * @param items - Mảng đầu vào
 * @returns Bản sao đã trộn
 */
export function shuffleArray<T>(items: T[]): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Chuẩn hóa chuỗi đáp án tự luận trước khi so khớp.
 * @param value - Chuỗi người dùng nhập
 * @returns Chuỗi đã chuẩn hóa
 */
export function normalizeText(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Lấy mặt nghĩa tiếng Việt — chỉ meaning, không kèm loại từ.
 * @param card - Thẻ flashcard
 * @returns Nghĩa tiếng Việt
 */
export function formatMeaning(card: Flashcard): string {
	return card.meaning;
}

/**
 * Lấy mặt câu hỏi hoặc đáp án theo hướng en/vi.
 * @param card - Thẻ flashcard
 * @param direction - Hướng câu hỏi
 * @param side - Mặt cần lấy
 * @returns Nội dung hiển thị
 */
export function getCardFace(
	card: Flashcard,
	direction: QuestionDirection,
	side: "prompt" | "answer",
): string {
	const isPromptEnglish = direction === "vi";
	const showEnglish =
		side === "prompt" ? isPromptEnglish : !isPromptEnglish;
	return showEnglish ? card.word : card.meaning;
}

/**
 * Phân bổ đều số câu cho từng loại đang bật, dư gán lần lượt theo thứ tự tf → mc → essay.
 * @param total - Tổng số câu
 * @param types - Các loại đang bật
 * @returns Map số câu theo loại
 */
export function distributeQuestionCounts(
	total: number,
	types: VocabQuestionType[],
): Record<VocabQuestionType, number> {
	const counts = Object.fromEntries(
		VOCAB_QUESTION_TYPE_ORDER.map((type) => [type, 0]),
	) as Record<VocabQuestionType, number>;

	if (types.length === 0) return counts;

	const base = Math.floor(total / types.length);
	let remainder = total % types.length;

	for (const type of VOCAB_QUESTION_TYPE_ORDER) {
		if (!types.includes(type)) continue;
		counts[type] = base + (remainder > 0 ? 1 : 0);
		if (remainder > 0) remainder -= 1;
	}

	return counts;
}

/**
 * Xác định hướng câu hỏi theo cấu hình ngôn ngữ trả lời.
 * @param answerLanguage - Cấu hình trả lời
 * @returns Hướng en hoặc vi
 */
export function resolveQuestionDirection(
	answerLanguage: VocabAnswerLanguage,
): QuestionDirection {
	if (answerLanguage === "both") {
		return Math.random() < 0.5 ? "en" : "vi";
	}
	return answerLanguage;
}

/**
 * Chọn thẻ khác ngẫu nhiên để tạo cặp sai cho câu Đúng/Sai.
 * @param cards - Danh sách thẻ
 * @param excludeId - Id thẻ gốc cần loại trừ
 * @returns Thẻ nhiễu hoặc null nếu deck chỉ có 1 thẻ
 */
function pickDistractorCard(
	cards: Flashcard[],
	excludeId: string,
): Flashcard | null {
	const pool = cards.filter((card) => card._id !== excludeId);
	if (pool.length === 0) return null;
	return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

/**
 * Tạo các lựa chọn nhiễu cho trắc nghiệm từ thẻ khác.
 * @param cards - Toàn bộ thẻ deck
 * @param card - Thẻ câu hỏi
 * @param direction - Hướng câu hỏi
 * @param optionCount - Số lựa chọn mong muốn
 * @returns Mảng lựa chọn đã trộn (gồm đáp án đúng)
 */
function buildMultipleChoiceOptions(
	cards: Flashcard[],
	card: Flashcard,
	direction: QuestionDirection,
	optionCount: number,
): string[] {
	const correct = getCardFace(card, direction, "answer");
	const distractors = shuffleArray(
		cards.filter((item) => item._id !== card._id),
	)
		.map((item) => getCardFace(item, direction, "answer"))
		.filter(
			(value, index, array) =>
				value !== correct && array.indexOf(value) === index,
		);

	const maxOptions = Math.min(optionCount, cards.length);
	const neededDistractors = Math.max(0, maxOptions - 1);
	const selectedDistractors = distractors.slice(0, neededDistractors);

	return shuffleArray([correct, ...selectedDistractors]);
}

/**
 * Sinh danh sách câu hỏi từ flashcard theo cấu hình bài kiểm tra.
 * @param cards - Toàn bộ thẻ deck
 * @param config - Cấu hình bài kiểm tra
 * @returns Danh sách câu hỏi đã nhóm theo loại
 */
export function buildQuestions(
	cards: Flashcard[],
	config: VocabTestConfig,
): VocabTestQuestion[] {
	if (cards.length === 0) return [];

	const questionCount = Math.min(config.count, cards.length);
	const enabledTypes = VOCAB_QUESTION_TYPE_ORDER.filter((type) =>
		config.questionTypes.includes(type),
	);

	if (enabledTypes.length === 0) return [];

	const counts = distributeQuestionCounts(questionCount, enabledTypes);
	const shuffledCards = shuffleArray(cards);
	let cardCursor = 0;

	const takeCards = (amount: number): Flashcard[] => {
		const slice = shuffledCards.slice(cardCursor, cardCursor + amount);
		cardCursor += amount;
		return slice;
	};

	const questions: VocabTestQuestion[] = [];
	let index = 0;

	for (const type of VOCAB_QUESTION_TYPE_ORDER) {
		if (!enabledTypes.includes(type)) continue;

		const cardsForType = takeCards(counts[type]);
		for (const card of cardsForType) {
			const direction = resolveQuestionDirection(config.answerLanguage);
			const id = `${type}-${card._id}-${index}-${Math.random().toString(36).slice(2, 8)}`;

			if (type === "tf") {
				const shouldMatch = Math.random() < 0.5;
				const distractor = pickDistractorCard(cards, card._id ?? "");
				const termCard =
					shouldMatch || !distractor ? card : distractor;

				questions.push({
					id,
					index,
					type: "tf",
					card,
					direction,
					definitionText: formatMeaning(card),
					termText: termCard.word,
					isMatch: termCard._id === card._id,
				});
				index += 1;
				continue;
			}

			if (type === "mc") {
				const options = buildMultipleChoiceOptions(
					cards,
					card,
					direction,
					4,
				);
				questions.push({
					id,
					index,
					type: "mc",
					card,
					direction,
					prompt: getCardFace(card, direction, "prompt"),
					options,
					correctOption: getCardFace(card, direction, "answer"),
				});
				index += 1;
				continue;
			}

			questions.push({
				id,
				index,
				type: "essay",
				card,
				direction,
				prompt: getCardFace(card, direction, "prompt"),
				correctAnswer: getCardFace(card, direction, "answer"),
			});
			index += 1;
		}
	}

	return questions;
}

/**
 * Chấm một câu hỏi dựa trên đáp án người dùng.
 * @param question - Câu hỏi
 * @param userAnswer - Đáp án người dùng (null = bỏ qua)
 * @returns Trạng thái đúng/sai/bỏ qua
 */
export function gradeQuestion(
	question: VocabTestQuestion,
	userAnswer: VocabTestUserAnswer | null,
): VocabQuestionResultStatus {
	if (!userAnswer) return "skipped";

	if (question.type === "tf") {
		if (userAnswer.type !== "tf") return "skipped";
		const expected = question.isMatch;
		return userAnswer.value === expected ? "correct" : "incorrect";
	}

	if (question.type === "mc") {
		if (userAnswer.type !== "mc") return "skipped";
		return normalizeText(userAnswer.value) ===
			normalizeText(question.correctOption)
			? "correct"
			: "incorrect";
	}

	if (userAnswer.type !== "essay") return "skipped";
	const normalizedUser = normalizeText(userAnswer.value);
	if (!normalizedUser) return "skipped";

	const acceptableAnswers = question.correctAnswer
		.split(/[,;/]/)
		.map((part) => normalizeText(part))
		.filter(Boolean);

	return acceptableAnswers.includes(normalizedUser) ? "correct" : "incorrect";
}

/**
 * Chấm toàn bộ bài và tổng hợp thống kê.
 * @param questions - Danh sách câu hỏi
 * @param answers - Map đáp án người dùng
 * @returns Kết quả từng câu và tổng hợp
 */
export function gradeTest(
	questions: VocabTestQuestion[],
	answers: Map<string, VocabTestUserAnswer>,
): { results: VocabQuestionResult[]; summary: VocabTestSummary } {
	const results: VocabQuestionResult[] = questions.map((question) => {
		const userAnswer = answers.get(question.id) ?? null;
		const status = gradeQuestion(question, userAnswer);
		return { question, userAnswer, status };
	});

	const correct = results.filter((item) => item.status === "correct").length;
	const incorrect = results.filter(
		(item) => item.status === "incorrect",
	).length;
	const skipped = results.filter((item) => item.status === "skipped").length;
	const total = questions.length;
	const accuracyPercent =
		total === 0 ? 0 : Math.round((correct / total) * 100);

	return {
		results,
		summary: {
			total,
			correct,
			incorrect,
			skipped,
			accuracyPercent,
		},
	};
}

/**
 * Parse cấu hình bài kiểm tra từ URL search params.
 * @param searchParams - Query string của route
 * @returns Cấu hình hợp lệ hoặc null
 */
export function parseTestConfig(
	searchParams: URLSearchParams,
): VocabTestConfig | null {
	const deckId = searchParams.get("deckId")?.trim();
	const countRaw = searchParams.get("count");
	const answerLanguage = searchParams.get("answer")?.trim() ?? "";
	const typesRaw = searchParams.get("types")?.trim() ?? "";

	if (!deckId || !countRaw || !ANSWER_LANGUAGE_SET.has(answerLanguage)) {
		return null;
	}

	const count = Number.parseInt(countRaw, 10);
	if (!Number.isFinite(count) || count < 1) return null;

	const questionTypes = typesRaw
		.split(",")
		.map((value) => value.trim())
		.filter((value): value is VocabQuestionType =>
			QUESTION_TYPE_SET.has(value),
		);

	if (questionTypes.length === 0) return null;

	return {
		deckId,
		count,
		answerLanguage: answerLanguage as VocabAnswerLanguage,
		questionTypes,
	};
}

/**
 * Tạo query string cho route bài kiểm tra.
 * @param config - Cấu hình bài kiểm tra
 * @returns Chuỗi search params
 */
export function buildTestSearchParams(config: VocabTestConfig): string {
	const params = new URLSearchParams({
		deckId: config.deckId,
		count: String(config.count),
		answer: config.answerLanguage,
		types: config.questionTypes.join(","),
	});
	return params.toString();
}

/**
 * Tạo cấu hình làm lại chỉ các câu sai từ kết quả hiện tại.
 * @param config - Cấu hình gốc
 * @param results - Kết quả bài vừa nộp
 * @returns Cấu hình mới hoặc null nếu không có câu sai
 */
export function buildRetryWrongConfig(
	config: VocabTestConfig,
	results: VocabQuestionResult[],
): VocabTestConfig | null {
	const wrongCount = results.filter(
		(item) => item.status === "incorrect" || item.status === "skipped",
	).length;

	if (wrongCount === 0) return null;

	return {
		...config,
		count: wrongCount,
	};
}
