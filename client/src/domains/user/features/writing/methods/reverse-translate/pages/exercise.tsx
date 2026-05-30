import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowLeft02Icon,
	Redo02Icon,
	IdeaIcon,
	HelpCircleIcon,
	Loading03Icon,
	CoinbaseIcon,
} from "@hugeicons/core-free-icons";

import type { ExerciseLevel, WritingExerciseTopic } from "@shared/types/utils";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { ExerciseLevelBadge } from "@user/components/exercise-level-badge";
import { translateTopic } from "@shared/lib/utils";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupButton,
} from "@shared/components/ui/input-group";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@shared/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { WordCard } from "@user/features/writing/methods/reverse-translate/components/word-card";
import { SentenceParagraph } from "@user/features/writing/methods/reverse-translate/components/sentence-paragraph";
import { FeedbackPanel } from "@user/features/writing/methods/reverse-translate/components/feedback-panel";
import { useReverseTranslate } from "@user/features/writing/methods/reverse-translate/hooks/use-reverse-translate";
import { MyWallet } from "@/domains/user/components/my-wallet";

import { queryClient } from "@shared/lib/query-client";

export function ReverseTranslateExercise() {
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();

	const {
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
		isLoading,
		isVocabListLoading,
		isSubmitting,
		isResetting,
	} = useReverseTranslate(id as string);

	const wasSubmittingRef = useRef(false);

	// Focus lại input sau khi nộp bài xong để tiếp tục gõ câu tiếp theo
	useEffect(() => {
		if (wasSubmittingRef.current && !isSubmitting && !isAllCompleted) {
			document.getElementById("rt-answer-input")?.focus();
		}
		wasSubmittingRef.current = isSubmitting;
	}, [isSubmitting, isAllCompleted]);

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.nativeEvent.isComposing) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const handleBack = () => {
		queryClient.invalidateQueries({ queryKey: ["reverse-translate", "list"] });
		navigate("/writing/reverse-translate");
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full min-h-dvh py-8 px-4 md:px-10 lg:px-20 lg:h-dvh lg:overflow-hidden">
			<div className="col-span-2 flex flex-col gap-4 lg:min-h-0">
				{/* Header */}
				<div className="flex items-center justify-between">
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
						<div className="flex gap-2">
							<span className="text-secondary-black text-sm">
								{translateTopic(exercise?.topic as WritingExerciseTopic)}
							</span>
							<span className="text-secondary-black text-sm">|</span>
							<ExerciseLevelBadge level={exercise?.level as ExerciseLevel} />
						</div>
					)}
				</div>

				{/* Paragraph */}
				<div className="flex flex-col gap-6 text-justify lg:overflow-y-auto lg:flex-1 lg:min-h-0">
					{isLoading ? (
						<Skeleton className="h-6 w-64 self-center" />
					) : (
						<h1 className="font-medium text-xl self-center">
							{exercise?.title}
						</h1>
					)}
					<SentenceParagraph
						sentences={sentences}
						currentSentenceIdx={currentSentenceIdx}
						viewingSentenceIdx={viewingSentenceIdx}
						onSentenceClick={setViewingSentenceIdx}
						isLoading={isLoading}
					/>
				</div>

				{/* Input area */}
				<div className="flex flex-col gap-2">
					<InputGroup className="bg-neutral-50 border-secondary-black rounded-full py-6 ps-4">
						<InputGroupInput
							id="rt-answer-input"
							type="text"
							placeholder={
								isAllCompleted
									? "Bạn đã hoàn thành tất cả các câu!"
									: "Nhập bản dịch cho câu đang được nêu bật..."
							}
							className="bg-neutral-50"
							value={userInput}
							onChange={(e) => setUserInput(e.target.value)}
							onKeyDown={onKeyDown}
							disabled={isAllCompleted || isSubmitting}
							autoComplete="off"
						/>
						<InputGroupAddon align="inline-end">
							<Dialog>
								<Tooltip>
									<TooltipTrigger asChild>
										<DialogTrigger asChild>
											<InputGroupButton
												variant="ghost"
												size="icon-sm"
												disabled={hint.length === 0}
											>
												<HugeiconsIcon
													icon={IdeaIcon}
													className="text-secondary-black"
												/>
											</InputGroupButton>
										</DialogTrigger>
									</TooltipTrigger>
									<TooltipContent>
										<p>{hint.length > 0 ? "Gợi ý" : "Không có gợi ý"}</p>
									</TooltipContent>
								</Tooltip>
								<DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-[min(85dvw,calc(100%-2rem))]">
									<DialogHeader className="shrink-0">
										<DialogTitle>Gợi ý</DialogTitle>
										<DialogDescription>
											Những từ vựng có thể sử dụng trong câu.
										</DialogDescription>
									</DialogHeader>
									<div className="grid grid-cols-1 gap-3 pt-2 lg:grid-cols-2 min-h-0 flex-1 overflow-y-auto no-scrollbar">
										{hint.map((word) => (
											<WordCard key={word._id} word={word} />
										))}
									</div>
								</DialogContent>
							</Dialog>

							<Tooltip>
								<TooltipTrigger asChild>
									<InputGroupButton
										variant={isResetting ? "greenHover" : "blackHover"}
										size={!isAllCompleted ? "sm" : "icon-sm"}
										onClick={isAllCompleted ? handleReset : handleSubmit}
										disabled={
											isAllCompleted
												? isResetting
												: isSubmitting || !userInput.trim()
										}
									>
										{isSubmitting || isResetting ? (
											<HugeiconsIcon
												icon={Loading03Icon}
												className="animate-spin"
											/>
										) : (
											<>
												<HugeiconsIcon
													icon={isAllCompleted ? Redo02Icon : CoinbaseIcon}
												/>
												{!isAllCompleted && <span>1</span>}
											</>
										)}
									</InputGroupButton>
								</TooltipTrigger>
								<TooltipContent>
									<p>{isAllCompleted ? "Làm lại" : "Gửi"}</p>
								</TooltipContent>
							</Tooltip>
						</InputGroupAddon>
					</InputGroup>
					<div className="flex justify-between items-center">
						<div className="flex gap-2 ms-4 items-center">
							<HugeiconsIcon
								icon={HelpCircleIcon}
								size={16}
								className="text-muted-foreground"
							/>
							<p className="text-xs text-muted-foreground">
								{isAllCompleted
									? `Hoàn thành ${progress.total}/${progress.total} câu.`
									: `Câu ${progress.completed + 1}/${progress.total} · Đạt 70 điểm để đến với câu tiếp theo.`}
							</p>
						</div>
						<MyWallet className="py-0.5 ps-0.5 pe-2 bg-neutral-50" secondary />
					</div>
				</div>
			</div>

			{/* Right panel */}
			<FeedbackPanel
				progress={progress}
				viewingFeedback={viewingFeedback}
				vocabList={vocabList}
				isVocabListLoading={isVocabListLoading}
				isSubmitting={isSubmitting}
				hasVocabulary={vocabList.length > 0}
			/>
		</div>
	);
}
