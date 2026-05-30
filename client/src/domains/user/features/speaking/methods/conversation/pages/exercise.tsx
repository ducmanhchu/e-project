import { useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";

import type { ExerciseLevel, WritingExerciseTopic } from "@shared/types/utils";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { ConversationLine } from "@user/features/speaking/methods/conversation/components/line";
import { ConversationRecorder } from "@user/features/speaking/methods/conversation/components/recorder";
import { ConversationFeedbackPanel } from "@user/features/speaking/methods/conversation/components/feedback-panel";
import { MyWallet } from "@user/components/my-wallet";

import { useConversation } from "@/domains/user/features/speaking/methods/conversation/hooks/use-conversation";
import { translateTopic } from "@shared/lib/utils";
import { ExerciseLevelBadge } from "@user/components/exercise-level-badge";
import { queryClient } from "@shared/lib/query-client";

export function ConversationExercise() {
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();

	const handleBack = () => {
		queryClient.invalidateQueries({ queryKey: ["conversation", "list"] });
		navigate(-1);
	};

	const {
		exercise,
		pairs,
		activePairIndex,
		maxSelectablePairIndex,
		phase,
		playbackUrl,
		viewingFeedback,
		isAllCompleted,
		isLoading,
		handleStartRecording,
		handleStopRecording,
		handleReRecord,
		handleSubmit,
		handleNext,
		handleRedo,
		handleSelectPair,
	} = useConversation(id as string);

	const isLastPair = activePairIndex >= pairs.length - 1;

	const visiblePairs = useMemo(
		() => pairs.slice(0, maxSelectablePairIndex + 1),
		[pairs, maxSelectablePairIndex],
	);

	const attemptOrders = useMemo(
		() => new Set((exercise?.messageAttempts ?? []).map((a) => a.messageOrder)),
		[exercise?.messageAttempts],
	);

	const activePairRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		activePairRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "end",
		});
	}, [activePairIndex, visiblePairs.length]);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full min-h-dvh py-8 px-4 md:px-10 lg:px-20 lg:h-dvh lg:overflow-hidden">
			{/* Left column */}
			<div className="lg:col-span-2 gap-4 flex flex-col h-full lg:overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between shrink-0">
					<Button
						variant="outline"
						size="icon"
						className="border-secondary-black bg-secondary-white group hover:bg-secondary-black transition-colors duration-300"
						onClick={handleBack}
					>
						<HugeiconsIcon
							icon={ArrowLeft02Icon}
							className="group-hover:text-secondary-white transition-colors duration-300"
						/>
					</Button>
					{isLoading ? (
						<div className="flex gap-2 items-center">
							<Skeleton className="h-4 w-24" />
							<span className="text-secondary-black text-sm">|</span>
							<Skeleton className="h-5 w-16 rounded-full" />
						</div>
					) : (
						<div className="flex gap-2 items-center">
							<span className="text-secondary-black text-sm">
								{translateTopic(exercise?.topic as WritingExerciseTopic)}
							</span>
							<span className="text-secondary-black text-sm">|</span>
							<ExerciseLevelBadge level={exercise?.level as ExerciseLevel} />
						</div>
					)}
				</div>

				{/* Scenario */}
				{isLoading ? (
					<div className="flex flex-col gap-2 w-full shrink-0">
						<Skeleton className="h-6 w-64 self-center" />
						<Skeleton className="h-16 w-full" />
					</div>
				) : (
					<div className="flex flex-col gap-2 w-full shrink-0">
						<h1 className="font-medium text-lg self-center">
							{exercise?.title}
						</h1>
						<p className="indent-8 text-secondary-black text-base text-justify self-center">
							{exercise?.scenario}{" "}
							{exercise?.speakers.map((speaker) => (
								<span key={speaker.key}>
									<i>{speaker.name}</i> - {speaker.persona}{" "}
								</span>
							))}
						</p>
					</div>
				)}

				{/* Chat thread */}
				{isLoading ? (
					<div className="flex flex-col gap-2 w-full flex-1">
						<Skeleton className="h-16 w-3/4 self-start rounded-2xl" />
						<Skeleton className="h-16 w-3/4 self-end rounded-2xl" />
					</div>
				) : visiblePairs.length > 0 ? (
					<div className="flex flex-col gap-4 w-full flex-1 overflow-y-auto no-scrollbar p-1.5">
						{visiblePairs.map((pair, idx) => {
							const isActive = idx === activePairIndex;
							const hasAttempt = attemptOrders.has(pair.lineB.order);
							return (
								<div
									key={pair.pairIndex}
									ref={isActive ? activePairRef : null}
									className="flex flex-col"
								>
									<ConversationLine
										order={pair.lineA.order}
										speakerKey="A"
										speakerName={
											exercise?.speakers.find(
												(s) => s.key === pair.lineA.speakerKey,
											)?.name || ""
										}
										text={pair.lineA.text}
										slang={pair.lineA.slang}
									/>
									<ConversationLine
										order={pair.lineB.order}
										speakerKey="B"
										speakerName={
											exercise?.speakers.find(
												(s) => s.key === pair.lineB.speakerKey,
											)?.name || ""
										}
										text={pair.lineB.text}
										slang={pair.lineB.slang}
										hasAttempt={hasAttempt}
										isActive={isActive}
										onSelect={
											hasAttempt && !isActive
												? () => handleSelectPair(idx)
												: undefined
										}
									/>
								</div>
							);
						})}
					</div>
				) : null}

				{/* Recorder */}
				{visiblePairs.length > 0 && (
					<div className="md:relative flex flex-col gap-3 md:gap-0 md:flex-row justify-center items-center w-full py-2">
						<ConversationRecorder
							phase={phase}
							playbackUrl={playbackUrl}
							isLastPair={isLastPair}
							isAllCompleted={isAllCompleted}
							onStartRecording={handleStartRecording}
							onStopRecording={handleStopRecording}
							onReRecord={handleReRecord}
							onSubmit={handleSubmit}
							onNext={handleNext}
							onRedo={handleRedo}
						/>
						<MyWallet
							className="md:absolute md:right-0 md:top-2 py-0.5 ps-0.5 pe-2 bg-neutral-50"
							secondary
						/>
					</div>
				)}
			</div>

			{/* Right column — Feedback panel */}
			<div className="w-full bg-neutral-50 border rounded-4xl lg:overflow-hidden">
				{phase === "assessing" || viewingFeedback ? (
					<ConversationFeedbackPanel
						feedback={viewingFeedback}
						isAssessing={phase === "assessing"}
					/>
				) : (
					<div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
						Kết quả đánh giá sẽ hiển thị ở đây
					</div>
				)}
			</div>
		</div>
	);
}
