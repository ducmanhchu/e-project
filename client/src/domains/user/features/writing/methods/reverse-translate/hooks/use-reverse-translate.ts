import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import type {
	CurrentFeedback,
	RTExerciseSubmitPayload,
} from "@shared/types/reverse-translate";
import {
	fetchRTExercise,
	submitRTExercise,
} from "@shared/api/reverse-translate";
import { resetExercise } from "@shared/api/attempt";
import { fetchWordList } from "@shared/api/vocab";
import { useBalance } from "@user/features/wallet/hooks/use-balance";
import { hasInsufficientCredits } from "@user/features/wallet/utils/credit-utils";

export function useReverseTranslate(exerciseId: string) {
	const queryClient = useQueryClient();
	const { data: balance } = useBalance();

	const exerciseQuery = useQuery({
		queryKey: ["reverse-translate", "exercise", exerciseId],
		queryFn: () => fetchRTExercise(exerciseId),
		enabled: !!exerciseId,
	});

	const exercise = exerciseQuery.data?.data;
	const sentences = useMemo(
		() => exercise?.sentences ?? [],
		[exercise?.sentences],
	);
	const vocabRefs = useMemo(
		() => exercise?.vocabularyRefs ?? [],
		[exercise?.vocabularyRefs],
	);

	const vocabIdsParam = useMemo(() => {
		if (!vocabRefs?.length) return "";
		return [...new Set(vocabRefs.map((item) => item.id))].join(",");
	}, [vocabRefs]);

	// Lấy danh sách từ vựng có trong bài
	const vocabListQuery = useQuery({
		queryKey: ["vocabulary", "list", vocabIdsParam],
		queryFn: () => fetchWordList({ ids: vocabIdsParam }),
		enabled: vocabIdsParam.length > 0,
	});

	const vocabList = useMemo(
		() => vocabListQuery.data?.data ?? [],
		[vocabListQuery.data?.data],
	);

	// Index của câu đang làm dở
	const currentSentenceIdx = useMemo(() => {
		const firstCompletedSentence = sentences?.find((item) => !item.isCompleted);
		return firstCompletedSentence?.order ?? null;
	}, [sentences]);

	// Câu đang được xem feedback
	const [viewingSentenceIdx, setViewingSentenceIdx] = useState<number | null>(
		null,
	);

	const [userInput, setUserInput] = useState("");

	const [currentFeedback, setCurrentFeedback] =
		useState<CurrentFeedback | null>(null);

	const submitMutation = useMutation({
		mutationFn: (payload: RTExerciseSubmitPayload) =>
			submitRTExercise(exerciseId, payload),
		onSuccess: (result, variables) => {
			const feedback: CurrentFeedback = {
				idx: variables.sentenceOrder,
				userAnswer: variables.userAnswer,
				score: result.data.score,
				feedback: result.data.feedback,
			};
			setCurrentFeedback(feedback);
			setViewingSentenceIdx(variables.sentenceOrder);

			if (result.data.isCompleted) {
				setUserInput("");
				queryClient.invalidateQueries({
					queryKey: ["reverse-translate", "exercise", exerciseId],
				});
				queryClient.invalidateQueries({
					queryKey: ["wallet", "balance"],
				});
			}
		},
		onError: () => {
			toast.error("Có lỗi khi gửi câu trả lời. Vui lòng thử lại sau!");
		},
	});

	const handleSubmit = useCallback(() => {
		if (hasInsufficientCredits(balance)) {
			toast.info("Bạn không có đủ xu. Vui lòng nạp thêm xu để tiếp tục!", {
				position: "bottom-right",
			});
			return;
		}
		const trimmed = userInput.trim();
		if (!trimmed || currentSentenceIdx === null || submitMutation.isPending)
			return;
		submitMutation.mutate({
			sentenceOrder: currentSentenceIdx,
			userAnswer: trimmed,
		});
	}, [userInput, currentSentenceIdx, submitMutation, balance]);

	const viewingFeedback = useMemo(() => {
		if (viewingSentenceIdx === null) return null;

		if (currentFeedback?.idx === viewingSentenceIdx) {
			return currentFeedback;
		}

		const sentence = sentences.find((s) => s.order === viewingSentenceIdx);
		if (!sentence?.lastSubmission) return null;

		return {
			idx: viewingSentenceIdx,
			userAnswer: sentence.lastSubmission.userAnswer,
			score: sentence.lastSubmission.score,
			feedback: sentence.lastSubmission.feedback,
		};
	}, [viewingSentenceIdx, currentFeedback, sentences]);

	const progress = useMemo(
		() => ({
			completed: sentences.filter((s) => s.isCompleted).length,
			total: sentences.length,
		}),
		[sentences],
	);

	const hint = useMemo(() => {
		if (currentSentenceIdx === null || !vocabRefs) return [];

		const idList = vocabRefs
			.filter((ref) => ref.sentenceIndex === currentSentenceIdx)
			.map((ref) => ref.id);

		if (!idList.length) return [];

		return vocabList.filter((w) => idList.includes(w._id));
	}, [currentSentenceIdx, vocabRefs, vocabList]);

	const isAllCompleted = currentSentenceIdx === null && sentences.length > 0;

	const resetMutation = useMutation({
		mutationFn: () => resetExercise(exerciseId, { action: "retry" }),
		onSuccess: () => {
			setUserInput("");
			setViewingSentenceIdx(null);
			setCurrentFeedback(null);
			queryClient.invalidateQueries({
				queryKey: ["reverse-translate", "exercise", exerciseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["reverse-translate", "list"],
			});
		},
		onError: () => {
			toast.error("Không thể làm lại bài tập. Vui lòng thử lại sau.");
		},
	});

	const handleReset = useCallback(() => {
		if (resetMutation.isPending) return;
		resetMutation.mutate();
	}, [resetMutation]);

	return {
		exercise,
		sentences,
		vocabList,
		currentSentenceIdx,
		viewingSentenceIdx,
		setViewingSentenceIdx,
		viewingFeedback,
		userInput,
		setUserInput,
		handleSubmit,
		handleReset,
		hint,
		isAllCompleted,
		progress,
		isLoading: exerciseQuery.isLoading,
		isVocabListLoading: vocabListQuery.isLoading,
		isSubmitting: submitMutation.isPending,
		isResetting: resetMutation.isPending,
	};
}
