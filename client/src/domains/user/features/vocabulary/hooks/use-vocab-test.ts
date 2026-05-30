import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	startTransition,
} from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFlashcardList } from "@shared/api/vocab";
import type { Flashcard } from "@shared/types/vocab";

import type {
	VocabQuestionResult,
	VocabTestConfig,
	VocabTestQuestion,
	VocabTestSummary,
	VocabTestUserAnswer,
} from "@user/features/vocabulary/types/test";
import {
	buildQuestions,
	gradeTest,
	parseTestConfig,
} from "@user/features/vocabulary/utils/test";

const FLASHCARD_FETCH_LIMIT = 100;

/**
 * Tải toàn bộ thẻ của deck (API giới hạn 100/th request).
 * @param deckId - Id học phần
 * @returns Danh sách flashcard
 */
async function fetchAllDeckFlashcards(deckId: string): Promise<Flashcard[]> {
	const firstPage = await fetchFlashcardList({
		deckId,
		page: 1,
		limit: FLASHCARD_FETCH_LIMIT,
	});

	const totalPages = firstPage.pagination?.totalPages ?? 1;
	const allCards = [...firstPage.data];

	for (let page = 2; page <= totalPages; page += 1) {
		const response = await fetchFlashcardList({
			deckId,
			page,
			limit: FLASHCARD_FETCH_LIMIT,
		});
		allCards.push(...response.data);
	}
	return allCards;
}

type UseVocabTestReturn = {
	config: VocabTestConfig | null;
	questions: VocabTestQuestion[];
	answers: Map<string, VocabTestUserAnswer>;
	phase: "taking" | "result";
	summary: VocabTestSummary | null;
	results: VocabQuestionResult[];
	isLoading: boolean;
	isError: boolean;
	sessionId: number;
	activeIndex: number;
	setActiveIndex: (index: number) => void;
	registerQuestionRef: (index: number, node: HTMLElement | null) => void;
	setAnswer: (questionId: string, answer: VocabTestUserAnswer) => void;
	clearAnswer: (questionId: string) => void;
	submitTest: (essayDrafts?: Record<string, string>) => void;
	retryWrong: () => void;
};

/**
 * Hook quản lý trạng thái bài kiểm tra từ vựng (fetch thẻ, sinh câu, chấm điểm).
 * @returns API trạng thái và thao tác bài kiểm tra
 */
export function useVocabTest(): UseVocabTestReturn {
	const [searchParams] = useSearchParams();
	const config = useMemo(
		() => parseTestConfig(searchParams),
		[searchParams],
	);

	const cardsQuery = useQuery({
		queryKey: ["flashcards", "test", config?.deckId],
		queryFn: () => fetchAllDeckFlashcards(config?.deckId as string),
		enabled: !!config?.deckId,
	});

	const [questions, setQuestions] = useState<VocabTestQuestion[]>([]);
	const [answers, setAnswers] = useState<Map<string, VocabTestUserAnswer>>(
		() => new Map(),
	);

	const [phase, setPhase] = useState<"taking" | "result">("taking");
	const [summary, setSummary] = useState<VocabTestSummary | null>(null);
	const [results, setResults] = useState<VocabQuestionResult[]>([]);
	const [activeIndex, setActiveIndexState] = useState(0);
	const [sessionId, setSessionId] = useState(0);

	const questionRefs = useRef<Map<number, HTMLElement>>(new Map());
	const initKeyRef = useRef<string | null>(null);

	const configInitKey = useMemo(() => {
		if (!config) return null;
		return [
			config.deckId,
			config.count,
			config.answerLanguage,
			config.questionTypes.join(","),
		].join("|");
	}, [config]);

	// Khởi tạo session sau khi fetch thẻ — cần effect vì phụ thuộc dữ liệu async
	useEffect(() => {
		if (!config || !cardsQuery.data || !configInitKey) return;
		if (initKeyRef.current === configInitKey) return;

		const safeCount = Math.min(config.count, cardsQuery.data.length);
		const nextQuestions = buildQuestions(cardsQuery.data, {
			...config,
			count: safeCount,
		});

		initKeyRef.current = configInitKey;
		startTransition(() => {
			setQuestions(nextQuestions);
			setAnswers(new Map());
			setPhase("taking");
			setSummary(null);
			setResults([]);
			setActiveIndexState(0);
			setSessionId((prev) => prev + 1);
		});
	}, [configInitKey, cardsQuery.data, config]);

	const registerQuestionRef = useCallback(
		(index: number, node: HTMLElement | null) => {
			if (node) {
				questionRefs.current.set(index, node);
				return;
			}
			questionRefs.current.delete(index);
		},
		[],
	);

	const scrollToQuestion = useCallback((index: number) => {
		const node = questionRefs.current.get(index);
		if (!node) return;
		node.scrollIntoView({ behavior: "smooth", block: "start" });
		setActiveIndexState(index);
	}, []);

	const setAnswer = useCallback(
		(questionId: string, answer: VocabTestUserAnswer) => {
			setAnswers((prev) => {
				const next = new Map(prev);
				next.set(questionId, answer);
				return next;
			});
		},
		[],
	);

	const clearAnswer = useCallback((questionId: string) => {
		setAnswers((prev) => {
			if (!prev.has(questionId)) return prev;
			const next = new Map(prev);
			next.delete(questionId);
			return next;
		});
	}, []);

	const submitTest = useCallback(
		(essayDrafts?: Record<string, string>) => {
			const mergedAnswers = new Map(answers);

			if (essayDrafts) {
				for (const question of questions) {
					if (question.type !== "essay") continue;
					const trimmed = essayDrafts[question.id]?.trim() ?? "";
					if (trimmed) {
						mergedAnswers.set(question.id, {
							type: "essay",
							value: trimmed,
						});
					} else {
						mergedAnswers.delete(question.id);
					}
				}
			}
			const graded = gradeTest(questions, mergedAnswers);
			setAnswers(mergedAnswers);
			setResults(graded.results);
			setSummary(graded.summary);
			setPhase("result");
		},
		[answers, questions],
	);

	const retryWrong = useCallback(() => {
		if (!config) return;

		const wrongResults = results.filter(
			(item) =>
				item.status === "incorrect" || item.status === "skipped",
		);
		if (wrongResults.length === 0) return;

		const wrongCards = wrongResults.map((item) => item.question.card);
		const nextQuestions = buildQuestions(wrongCards, {
			...config,
			count: wrongCards.length,
		});

		setQuestions(nextQuestions);
		setAnswers(new Map());
		setPhase("taking");
		setSummary(null);
		setResults([]);
		setActiveIndexState(0);
		setSessionId((prev) => prev + 1);
	}, [config, results]);

	return {
		config,
		questions,
		answers,
		phase,
		summary,
		results,
		isLoading: cardsQuery.isLoading,
		isError: cardsQuery.isError,
		sessionId,
		activeIndex,
		setActiveIndex: scrollToQuestion,
		registerQuestionRef,
		setAnswer,
		clearAnswer,
		submitTest,
		retryWrong,
	};
}


