import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
	fetchSAWExercise,
	submitKeyword,
	submitParagraph,
} from "@shared/api/see-and-write";
import type {
	SAWExercise,
	SAWStep,
	KeywordStatus,
} from "@shared/types/see-and-write";
import { queryClient } from "@shared/lib/query-client";

function escapeRegExp(str: string) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countWords(text: string) {
	const trimmed = text.trim();
	if (!trimmed) return 0;
	return trimmed.split(/\s+/).length;
}

export function useSeeAndWrite(exerciseId: string) {
	const exerciseQuery = useQuery({
		queryKey: ["see-and-write", "exercise", exerciseId],
		queryFn: () => fetchSAWExercise(exerciseId),
		enabled: !!exerciseId,
	});

	const exercise = exerciseQuery.data?.data;

	const [keywordResult, setKeywordResult] =
		useState<SAWExercise["keywordQuiz"]>(null);
	const [paragraphResult, setParagraphResult] =
		useState<SAWExercise["lastSubmission"]>(null);

	const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<string>>(
		new Set(),
	);
	const [paragraph, setParagraph] = useState("");

	const [prevExerciseId, setPrevExerciseId] = useState(exerciseId);
	const [serverSyncedForId, setServerSyncedForId] = useState<string | null>(
		null,
	);

	if (prevExerciseId !== exerciseId) {
		setPrevExerciseId(exerciseId);
		setKeywordResult(null);
		setParagraphResult(null);
		setSelectedKeywordIds(new Set());
		setParagraph("");
		setServerSyncedForId(null);
	} else if (
		exercise &&
		exercise.id === exerciseId &&
		serverSyncedForId !== exerciseId
	) {
		setKeywordResult(exercise.keywordQuiz);
		setParagraphResult(exercise.lastSubmission);
		setServerSyncedForId(exerciseId);
	}

	const currentStep: SAWStep = !keywordResult
		? "select"
		: !paragraphResult
			? "writing"
			: "viewing";

	const submitKeywordsMutation = useMutation({
		mutationFn: (ids: string[]) =>
			submitKeyword(exerciseId, { selectedKeywordIds: ids }),
		onSuccess: (res) => {
			setKeywordResult(res.data);
			queryClient.invalidateQueries({
				queryKey: ["see-and-write", "exercise", exerciseId],
			});
		},
	});

	const submitParagraphMutation = useMutation({
		mutationFn: (userAnswer: string) =>
			submitParagraph(exerciseId, { userAnswer }),
		onSuccess: (res, userAnswer) => {
			setParagraphResult({
				userAnswer,
				score: res.data.score,
				gradedBy: res.data.gradedBy,
				feedback: res.data.feedback,
				createdAt: new Date().toISOString(),
			});
			queryClient.invalidateQueries({
				queryKey: ["see-and-write", "list", exerciseId],
			});
		},
	});

	const requiredKeywordCount = exercise?.requiredKeywordCount ?? 0;
	const isSelectionFull =
		requiredKeywordCount > 0 && selectedKeywordIds.size >= requiredKeywordCount;

	const toggleKeyword = useCallback(
		(id: string) => {
			if (currentStep !== "select") return;
			setSelectedKeywordIds((prev) => {
				const next = new Set(prev);
				if (next.has(id)) {
					next.delete(id);
					return next;
				}
				if (next.size >= requiredKeywordCount) return prev;
				next.add(id);
				return next;
			});
		},
		[currentStep, requiredKeywordCount],
	);

	const isKeywordDisabled = useCallback(
		(id: string) => {
			if (currentStep !== "select") return false;
			if (!isSelectionFull) return false;
			return !selectedKeywordIds.has(id);
		},
		[currentStep, isSelectionFull, selectedKeywordIds],
	);

	const getKeywordStatus = useCallback(
		(word: string): KeywordStatus | undefined => {
			if (!keywordResult) return undefined;
			if (keywordResult.correct.some((k) => k.word === word)) return "correct";
			if (keywordResult.wrong.some((k) => k.word === word)) return "wrong";
			if (keywordResult.missed.some((k) => k.word === word)) return "missed";
			return undefined;
		},
		[keywordResult],
	);

	const paragraphValidation = useMemo(() => {
		const trimmed = paragraph.trim();
		const wordCount = countWords(trimmed);
		const minWordCount = exercise?.minWordCount ?? 0;
		const maxWordCount = exercise?.maxWordCount ?? Number.POSITIVE_INFINITY;

		const isMinOk = wordCount >= minWordCount;
		const isMaxOk = wordCount <= maxWordCount;

		const usedKeywordCount =
			exercise?.wordPool.reduce((acc, k) => {
				const re = new RegExp(`\\b${escapeRegExp(k.word)}\\b`, "i");
				return re.test(trimmed) ? acc + 1 : acc;
			}, 0) ?? 0;
		const hasKeyword = usedKeywordCount >= 1;

		return {
			wordCount,
			usedKeywordCount,
			isMinOk,
			isMaxOk,
			hasKeyword,
			isValid: isMinOk && isMaxOk && hasKeyword,
		};
	}, [paragraph, exercise]);

	const handleSubmitKeywords = useCallback(() => {
		if (!exercise) return;
		if (selectedKeywordIds.size !== exercise.requiredKeywordCount) return;
		if (submitKeywordsMutation.isPending) return;
		submitKeywordsMutation.mutate(Array.from(selectedKeywordIds));
	}, [exercise, selectedKeywordIds, submitKeywordsMutation]);

	const handleSubmitParagraph = useCallback(() => {
		const trimmed = paragraph.trim();
		if (!paragraphValidation.isValid) return;
		if (submitParagraphMutation.isPending) return;
		submitParagraphMutation.mutate(trimmed);
	}, [paragraph, paragraphValidation.isValid, submitParagraphMutation]);

	const handleRetry = useCallback(() => {
		setKeywordResult(null);
		setParagraphResult(null);
		setSelectedKeywordIds(new Set());
		setParagraph("");
	}, []);

	return {
		exercise,
		isLoading: exerciseQuery.isLoading,
		currentStep,

		// Bước 1
		selectedKeywordIds,
		toggleKeyword,
		isKeywordDisabled,
		canSubmitKeywords:
			!!exercise && selectedKeywordIds.size === exercise.requiredKeywordCount,
		isSubmittingKeywords: submitKeywordsMutation.isPending,
		handleSubmitKeywords,
		keywordResult,
		getKeywordStatus,

		// Bước 2
		paragraph,
		setParagraph,
		paragraphValidation,
		isSubmittingParagraph: submitParagraphMutation.isPending,
		handleSubmitParagraph,
		paragraphResult,

		// Retry
		handleRetry,
	};
}
