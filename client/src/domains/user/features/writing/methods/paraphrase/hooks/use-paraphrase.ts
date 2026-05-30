import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { toast } from "sonner";

import type {
	ParaphraseExercise,
	ParaphraseSubmitPayload,
} from "@shared/types/paraphrase";
import {
	fetchParaphraseExercise,
	submitParaphraseSentence,
} from "@shared/api/paraphrase";
import { queryClient } from "@shared/lib/query-client";
import { useBalance } from "@user/features/wallet/hooks/use-balance";
import { hasInsufficientCredits } from "@user/features/wallet/utils/credit-utils";

type SentenceFeedback = NonNullable<
	ParaphraseExercise["sentences"][number]["lastSubmission"]
>;

type CurrentFeedback = {
	order: number;
	userAnswer: string;
	score: number;
	feedback: SentenceFeedback["feedback"];
};

export function useParaphrase(exerciseId: string) {
	const { data: balance } = useBalance();

	const exerciseQuery = useQuery({
		queryKey: ["paraphrase", "exercise", exerciseId],
		queryFn: () => fetchParaphraseExercise(exerciseId),
		enabled: !!exerciseId,
	});

	const exercise = exerciseQuery.data?.data;

	const sentences = useMemo(
		() => exercise?.sentences ?? [],
		[exercise?.sentences],
	);

	// Index của câu chưa hoàn thành đầu tiên — null khi toàn bộ đã xong
	const firstIncompleteOrder = useMemo(() => {
		const target = sentences.find((s) => !s.isCompleted);
		return target?.order ?? null;
	}, [sentences]);

	// Index lớn nhất user được phép truy cập: câu đã hoàn thành + câu dở hiện tại.
	// Nếu đã xong toàn bộ thì cho phép xem mọi câu.
	const maxSelectableOrder = useMemo(() => {
		if (firstIncompleteOrder !== null) return firstIncompleteOrder;
		return sentences.length;
	}, [firstIncompleteOrder, sentences.length]);

	const [viewingOrder, setViewingOrder] = useState<number | null>(null);
	const [userInput, setUserInput] = useState("");
	const [isRetrying, setIsRetrying] = useState(false);
	const [currentFeedback, setCurrentFeedback] =
		useState<CurrentFeedback | null>(null);

	// Đồng bộ viewingOrder lần đầu khi exercise vừa load: nhảy tới câu dở đầu tiên.
	const [syncedForId, setSyncedForId] = useState<string | null>(null);
	const [prevExerciseId, setPrevExerciseId] = useState(exerciseId);

	if (prevExerciseId !== exerciseId) {
		setPrevExerciseId(exerciseId);
		setViewingOrder(null);
		setUserInput("");
		setIsRetrying(false);
		setCurrentFeedback(null);
		setSyncedForId(null);
	} else if (
		exercise &&
		exercise.id === exerciseId &&
		syncedForId !== exerciseId &&
		viewingOrder === null &&
		sentences.length > 0
	) {
		const initialOrder = firstIncompleteOrder ?? sentences[0].order;
		const initialSentence = sentences.find((s) => s.order === initialOrder);
		setViewingOrder(initialOrder);
		setUserInput(
			initialSentence?.isCompleted && initialSentence.lastSubmission
				? initialSentence.lastSubmission.userAnswer
				: "",
		);
		setSyncedForId(exerciseId);
	}

	const currentSentence = useMemo(
		() => sentences.find((s) => s.order === viewingOrder) ?? null,
		[sentences, viewingOrder],
	);

	const isViewingCompleted = currentSentence?.isCompleted ?? false;

	const viewingFeedback = useMemo<CurrentFeedback | null>(() => {
		if (viewingOrder === null) return null;

		if (currentFeedback?.order === viewingOrder) return currentFeedback;

		if (currentSentence?.lastSubmission) {
			return {
				order: viewingOrder,
				userAnswer: currentSentence.lastSubmission.userAnswer,
				score: currentSentence.lastSubmission.score,
				feedback: currentSentence.lastSubmission.feedback,
			};
		}

		return null;
	}, [viewingOrder, currentFeedback, currentSentence]);

	const progress = useMemo(
		() => ({
			completed: sentences.filter((s) => s.isCompleted).length,
			total: sentences.length,
		}),
		[sentences],
	);

	const isAllCompleted = firstIncompleteOrder === null && sentences.length > 0;

	const submitMutation = useMutation({
		mutationFn: (payload: ParaphraseSubmitPayload) =>
			submitParaphraseSentence(exerciseId, payload),
		onSuccess: (result, variables) => {
			setCurrentFeedback({
				order: variables.sentenceOrder,
				userAnswer: variables.userAnswer,
				score: result.data.score,
				feedback: result.data.feedback,
			});
			setIsRetrying(false);
			setUserInput(variables.userAnswer);
			queryClient.invalidateQueries({
				queryKey: ["paraphrase", "exercise", exerciseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["wallet", "balance"],
			});
		},
	});

	const handleChangeOrder = useCallback(
		(order: number) => {
			if (order > maxSelectableOrder) return;
			setViewingOrder(order);
			setIsRetrying(false);
			const target = sentences.find((s) => s.order === order);
			setUserInput(
				target?.isCompleted && target.lastSubmission
					? target.lastSubmission.userAnswer
					: "",
			);
		},
		[sentences, maxSelectableOrder],
	);

	const handleRedo = useCallback(() => {
		if (!isViewingCompleted) return;
		setIsRetrying(true);
		setUserInput("");
	}, [isViewingCompleted]);

	const handleSubmit = useCallback(() => {
		if (hasInsufficientCredits(balance)) {
			toast.info("Bạn không có đủ xu. Vui lòng nạp thêm xu để tiếp tục!", {
				position: "bottom-right",
			});
			return;
		}
		const trimmed = userInput.trim();
		if (
			!trimmed ||
			viewingOrder === null ||
			submitMutation.isPending ||
			(isViewingCompleted && !isRetrying)
		) {
			return;
		}
		submitMutation.mutate({
			sentenceOrder: viewingOrder,
			userAnswer: trimmed,
		});
	}, [
		userInput,
		viewingOrder,
		submitMutation,
		isViewingCompleted,
		isRetrying,
		balance,
	]);

	const isSubmitting = submitMutation.isPending;
	const isInputDisabled = isSubmitting || (isViewingCompleted && !isRetrying);
	const shouldShowRedoIcon = isViewingCompleted && !isRetrying;
	const canSubmit =
		userInput.trim().length > 0 &&
		viewingOrder !== null &&
		!isSubmitting &&
		(!isViewingCompleted || isRetrying);

	return {
		exercise,
		sentences,
		viewingOrder,
		currentSentence,
		userInput,
		setUserInput,
		isViewingCompleted,
		isRetrying,
		viewingFeedback,
		maxSelectableOrder,
		isAllCompleted,
		progress,
		handleChangeOrder,
		handleRedo,
		handleSubmit,
		canSubmit,
		isInputDisabled,
		shouldShowRedoIcon,
		isLoading: exerciseQuery.isLoading,
		isSubmitting,
	};
}
