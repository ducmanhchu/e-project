import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	startWavRecording,
	type WavRecorderControls,
} from "@shared/lib/audio-recording";

import type {
	ConversationExercise,
	PronunciationResultPayload,
	ConversationSubmitPayload,
} from "@shared/types/conversation";
import { toast } from "sonner";
import { assessPronunciation } from "@shared/lib/azure";
import {
	useAzureToken,
	ensureAzureToken,
} from "@/shared/hooks/use-azure-token";
import {
	getConversationExercise,
	submitConversation,
} from "@shared/api/conversation";
import { queryClient } from "@shared/lib/query-client";
import { useBalance } from "@user/features/wallet/hooks/use-balance";
import { hasInsufficientCredits } from "@user/features/wallet/utils/credit-utils";

export type Phase =
	| "idle"
	| "recording"
	| "playback"
	| "assessing"
	| "feedback";

type Message = ConversationExercise["messages"][number];

export type DialoguePair = {
	pairIndex: number;
	lineA: Message;
	lineB: Message;
};

function buildPairs(messages: Message[]): DialoguePair[] {
	const pairs: DialoguePair[] = [];
	for (let i = 0; i < messages.length - 1; i += 2) {
		pairs.push({
			pairIndex: i / 2,
			lineA: messages[i],
			lineB: messages[i + 1],
		});
	}
	return pairs;
}

function revokePlaybackUrl(url: string | null) {
	if (url) URL.revokeObjectURL(url);
}

export function useConversation(exerciseId: string) {
	const { data: balance } = useBalance();

	const exerciseQuery = useQuery({
		queryKey: ["conversation", "exercise", exerciseId],
		queryFn: () => getConversationExercise(exerciseId),
		enabled: !!exerciseId,
	});

	const exercise = exerciseQuery.data?.data;

	const pairs = useMemo(
		() => buildPairs(exercise?.messages ?? []),
		[exercise?.messages],
	);

	const messageAttempts = useMemo(
		() => exercise?.messageAttempts ?? [],
		[exercise?.messageAttempts],
	);

	const attemptByOrder = useMemo(() => {
		const map = new Map<number, (typeof messageAttempts)[number]>();
		for (const a of messageAttempts) map.set(a.messageOrder, a);
		return map;
	}, [messageAttempts]);

	const firstIncompletePairIndex = useMemo(() => {
		const idx = pairs.findIndex((p) => !attemptByOrder.has(p.lineB.order));
		return idx === -1 ? null : idx;
	}, [pairs, attemptByOrder]);

	const isAllCompleted =
		exercise?.status === "completed" ||
		(firstIncompletePairIndex === null && pairs.length > 0);

	const maxSelectablePairIndex = useMemo(() => {
		if (isAllCompleted) return pairs.length - 1;
		return firstIncompletePairIndex ?? 0;
	}, [isAllCompleted, firstIncompletePairIndex, pairs.length]);

	const [activePairIndex, setActivePairIndex] = useState(0);
	const [phase, setPhase] = useState<Phase>("idle");
	const [recordingFile, setRecordingFile] = useState<File | null>(null);
	const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
	const [localFeedback, setLocalFeedback] =
		useState<PronunciationResultPayload | null>(null);
	const [syncedForId, setSyncedForId] = useState<string | null>(null);
	const [prevExerciseId, setPrevExerciseId] = useState(exerciseId);

	const recorderRef = useRef<WavRecorderControls | null>(null);

	const clearRecording = useCallback((url: string | null) => {
		revokePlaybackUrl(url);
		setRecordingFile(null);
		setPlaybackUrl(null);
	}, []);

	const resetFeedbackState = useCallback(() => {
		setLocalFeedback(null);
	}, []);

	const phaseForPair = useCallback(
		(pairIndex: number): Phase => {
			const hasAttempt = attemptByOrder.has(pairs[pairIndex]?.lineB.order);
			return hasAttempt ? "feedback" : "idle";
		},
		[attemptByOrder, pairs],
	);

	const goToPair = useCallback(
		(pairIndex: number) => {
			resetFeedbackState();
			clearRecording(playbackUrl);
			setActivePairIndex(pairIndex);
			setPhase(phaseForPair(pairIndex));
		},
		[resetFeedbackState, clearRecording, playbackUrl, phaseForPair],
	);

	if (prevExerciseId !== exerciseId) {
		setPrevExerciseId(exerciseId);
		setActivePairIndex(0);
		setPhase("idle");
		setLocalFeedback(null);
		setSyncedForId(null);
		setRecordingFile(null);
		setPlaybackUrl((url) => {
			revokePlaybackUrl(url);
			return null;
		});
	} else if (
		exercise &&
		exercise.id === exerciseId &&
		syncedForId !== exerciseId &&
		pairs.length > 0
	) {
		const initial = firstIncompletePairIndex ?? 0;
		setActivePairIndex(initial);
		setPhase(phaseForPair(initial));
		setSyncedForId(exerciseId);
	}

	useEffect(() => {
		recorderRef.current?.stop().catch(() => {});
		recorderRef.current = null;
	}, [exerciseId]);

	useEffect(() => {
		return () => {
			revokePlaybackUrl(playbackUrl);
			recorderRef.current?.stop().catch(() => {});
			recorderRef.current = null;
		};
	}, [playbackUrl]);

	const currentPair = pairs[activePairIndex] ?? null;

	const viewingFeedback = useMemo<PronunciationResultPayload | null>(() => {
		if (!currentPair) return null;
		if (localFeedback && phase === "feedback") return localFeedback;
		const attempt = attemptByOrder.get(currentPair.lineB.order);
		return attempt?.feedback ?? null;
	}, [currentPair, localFeedback, phase, attemptByOrder]);

	const { data: azureToken, refetch: refetchToken } =
		useAzureToken(!!exerciseId);

	const handleStartRecording = useCallback(async () => {
		try {
			const controls = await startWavRecording();
			recorderRef.current = controls;
			setPhase("recording");
		} catch {
			toast.error("Không thể truy cập microphone.");
		}
	}, []);

	const handleStopRecording = useCallback(async () => {
		if (!recorderRef.current) return;

		try {
			const file = await recorderRef.current.stop();
			recorderRef.current = null;

			clearRecording(playbackUrl);
			setRecordingFile(file);
			setPlaybackUrl(URL.createObjectURL(file));
			setPhase("playback");
		} catch {
			recorderRef.current = null;
			toast.error("Không thu được dữ liệu âm thanh.");
			setPhase("idle");
		}
	}, [clearRecording, playbackUrl]);

	const handleReRecord = useCallback(() => {
		clearRecording(playbackUrl);
		setPhase("idle");
	}, [clearRecording, playbackUrl]);

	const submitMutation = useMutation({
		mutationFn: (payload: ConversationSubmitPayload) =>
			submitConversation(exerciseId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["conversation", "exercise", exerciseId],
			});
			queryClient.invalidateQueries({
				queryKey: ["wallet", "balance"],
			});
		},
	});

	const handleSubmit = useCallback(async () => {
		if (hasInsufficientCredits(balance)) {
			toast.info("Bạn không có đủ xu. Vui lòng nạp thêm xu để tiếp tục!", {
				position: "bottom-right",
			});
			return;
		}
		if (!recordingFile || !currentPair || submitMutation.isPending) return;

		setPhase("assessing");

		try {
			const auth = await ensureAzureToken(azureToken, refetchToken);
			const feedback = await assessPronunciation(
				recordingFile,
				currentPair.lineB.text,
				auth,
			);

			setLocalFeedback(feedback);

			await submitMutation.mutateAsync({
				messageOrder: currentPair.lineB.order,
				targetText: currentPair.lineB.text,
				feedback,
			});

			clearRecording(playbackUrl);
			setPhase("feedback");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Đã xảy ra lỗi khi đánh giá.",
			);
			setPhase("playback");
		}
	}, [
		recordingFile,
		currentPair,
		submitMutation,
		azureToken,
		refetchToken,
		clearRecording,
		playbackUrl,
		balance,
	]);

	const handleNext = useCallback(() => {
		if (activePairIndex >= pairs.length - 1) return;
		goToPair(activePairIndex + 1);
	}, [activePairIndex, pairs.length, goToPair]);

	const handleRedo = useCallback(() => {
		resetFeedbackState();
		clearRecording(playbackUrl);
		setPhase("idle");
	}, [resetFeedbackState, clearRecording, playbackUrl]);

	const handleSelectPair = useCallback(
		(pairIndex: number) => {
			if (pairIndex < 0 || pairIndex > maxSelectablePairIndex) return;
			if (pairIndex === activePairIndex) return;
			goToPair(pairIndex);
		},
		[maxSelectablePairIndex, activePairIndex, goToPair],
	);

	return {
		exercise,
		pairs,
		activePairIndex,
		maxSelectablePairIndex,
		phase,
		playbackUrl,
		viewingFeedback,
		isAllCompleted,
		isLoading: exerciseQuery.isLoading,
		handleStartRecording,
		handleStopRecording,
		handleReRecord,
		handleSubmit,
		handleNext,
		handleRedo,
		handleSelectPair,
	};
}
