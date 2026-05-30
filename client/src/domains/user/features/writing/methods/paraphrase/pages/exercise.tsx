import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowLeft02Icon,
	Redo02Icon,
	Loading03Icon,
	HelpCircleIcon,
	CoinbaseIcon,
	ArrowRight02Icon,
} from "@hugeicons/core-free-icons";

import type { WritingExerciseTopic, ExerciseLevel } from "@shared/types/utils";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { ExerciseLevelBadge } from "@user/components/exercise-level-badge";
import { Field } from "@shared/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@shared/components/ui/select";
import {
	InputGroup,
	InputGroupInput,
	InputGroupAddon,
	InputGroupButton,
} from "@shared/components/ui/input-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { ShimmerText } from "@user/components/shimmer-text";
import { SentenceFeedback } from "@user/features/writing/methods/paraphrase/components/sentence-feedback";
import { MyWallet } from "@user/components/my-wallet";

import { queryClient } from "@shared/lib/query-client";
import { cn, translateTopic } from "@shared/lib/utils";
import { useParaphrase } from "@user/features/writing/methods/paraphrase/hooks/use-paraphrase";

export function ParaphraseExercise() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const {
		exercise,
		sentences,
		viewingOrder,
		currentSentence,
		userInput,
		setUserInput,
		viewingFeedback,
		maxSelectableOrder,
		isAllCompleted,
		progress,
		handleChangeOrder,
		handleRedo,
		handleSubmit,
		handleNextSentence,
		canSubmit,
		isViewingCompleted,
		isInputDisabled,
		shouldShowRedoIcon,
		shouldShowNextButton,
		isLoading,
		isSubmitting,
	} = useParaphrase(id as string);

	const inputRef = useRef<HTMLInputElement>(null);
	const nextButtonRef = useRef<HTMLButtonElement>(null);
	const wasSubmittingRef = useRef(false);
	const pendingFocusRef = useRef<"next" | "input" | null>(null);

	// Cập nhật trạng thái câu tiếp theo trước fetch để focus ngay khi nộp xong (trước khi nút tiếp theo mount)
	useEffect(() => {
		if (wasSubmittingRef.current && !isSubmitting && viewingFeedback) {
			if (viewingFeedback.score >= 70 && shouldShowNextButton) {
				pendingFocusRef.current = "next";
			} else if (viewingFeedback.score < 70) {
				pendingFocusRef.current = "input";
			}
		}
		wasSubmittingRef.current = isSubmitting;
	}, [isSubmitting, viewingFeedback, shouldShowNextButton]);

	// Focus input khi không đạt điểm
	useEffect(() => {
		if (pendingFocusRef.current !== "input" || isInputDisabled) return;
		inputRef.current?.focus();
		pendingFocusRef.current = null;
	}, [isInputDisabled, viewingFeedback]);

	// Focus nút tiếp theo sau khi mount (đạt điểm + còn câu kế)
	useEffect(() => {
		if (pendingFocusRef.current !== "next" || !shouldShowNextButton) return;
		const frameId = requestAnimationFrame(() => {
			nextButtonRef.current?.focus();
			pendingFocusRef.current = null;
		});
		return () => cancelAnimationFrame(frameId);
	}, [shouldShowNextButton]);

	const handleBack = () => {
		queryClient.invalidateQueries({ queryKey: ["paraphrase", "list"] });
		navigate(-1);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.nativeEvent.isComposing) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const exerciseData = exercise;

	return (
		<div className="flex flex-col gap-6 w-full min-h-dvh py-8 px-4 md:px-10 lg:px-20">
			<div className="flex justify-between items-center">
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
							{translateTopic(exerciseData?.topic as WritingExerciseTopic)}
						</span>
						<span className="text-secondary-black text-sm">|</span>
						<ExerciseLevelBadge level={exerciseData?.level as ExerciseLevel} />
					</div>
				)}
			</div>

			<div className="flex flex-col justify-between items-center gap-6 px-6 py-4 bg-neutral-50 rounded-4xl border min-h-[50vh]">
				<div className="flex items-center w-full">
					{isLoading ? (
						<Skeleton className="h-6 w-64 mx-auto" />
					) : (
						<h1 className="text-xl font-medium flex-1 text-center md:ps-20">
							{exerciseData?.title}
						</h1>
					)}
					<Field className="w-25 ml-auto">
						<Select
							value={viewingOrder ? viewingOrder.toString() : undefined}
							onValueChange={(v) => handleChangeOrder(Number(v))}
							disabled={isLoading || sentences.length === 0}
						>
							<SelectTrigger
								className={cn(
									"bg-neutral-50",
									isViewingCompleted && "bg-secondary-green",
								)}
							>
								<SelectValue placeholder="Câu" />
							</SelectTrigger>
							<SelectContent position="popper">
								<SelectGroup>
									{sentences.map((s) => {
										const isDisabled = s.order > maxSelectableOrder;
										return (
											<SelectItem
												key={s.order}
												value={s.order.toString()}
												disabled={isDisabled}
												className={cn(
													s.isCompleted &&
														"text-green-700 focus:bg-secondary-green data-highlighted:bg-secondary-green",
												)}
											>
												Câu {s.order}
											</SelectItem>
										);
									})}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
				</div>

				{isLoading ? (
					<Skeleton className="h-7 w-3/4" />
				) : (
					<p className="text-secondary-black text-lg text-center">
						{currentSentence?.targetSentence}
					</p>
				)}

				<div className="flex flex-col w-full gap-2">
					<InputGroup className="bg-neutral-50 border-secondary-black rounded-full py-6 ps-4">
						<InputGroupInput
							ref={inputRef}
							id="paraphrase-answer-input"
							placeholder={
								isAllCompleted
									? "Bạn đã hoàn thành tất cả các câu!"
									: "Diễn đạt lại câu văn đang được hiển thị bằng tiếng Anh..."
							}
							value={userInput}
							onChange={(e) => setUserInput(e.target.value)}
							onKeyDown={onKeyDown}
							disabled={isInputDisabled || isLoading}
							autoComplete="off"
						/>
						<InputGroupAddon align="inline-end">
							{shouldShowNextButton && (
								<Tooltip>
									<TooltipTrigger asChild>
										<InputGroupButton
											ref={nextButtonRef}
											variant="blackHover"
											size="sm"
											onClick={handleNextSentence}
											aria-label="Câu tiếp theo"
										>
											<HugeiconsIcon icon={ArrowRight02Icon} />
											Tiếp theo
										</InputGroupButton>
									</TooltipTrigger>
									<TooltipContent>
										<p>Câu tiếp theo</p>
									</TooltipContent>
								</Tooltip>
							)}
							<Tooltip>
								<TooltipTrigger asChild>
									<InputGroupButton
										variant={shouldShowRedoIcon ? "greenHover" : "blackHover"}
										size={!shouldShowRedoIcon ? "sm" : "icon-sm"}
										className={cn(isSubmitting && "h-8! w-48 shrink-0 px-2")}
										onClick={shouldShowRedoIcon ? handleRedo : handleSubmit}
										disabled={
											isLoading ||
											isSubmitting ||
											(shouldShowRedoIcon ? false : !canSubmit)
										}
									>
										{isSubmitting ? (
											<>
												<HugeiconsIcon
													icon={Loading03Icon}
													className="animate-spin shrink-0"
												/>
												<ShimmerText
													className="min-h-0 min-w-0 flex-1 justify-start overflow-hidden"
													textClassName="text-xs whitespace-nowrap [--base-color:var(--color-secondary-white)] [--shimmer-color:white]"
												/>
											</>
										) : (
											<>
												<HugeiconsIcon
													icon={shouldShowRedoIcon ? Redo02Icon : CoinbaseIcon}
												/>
												{!shouldShowRedoIcon && <span>1</span>}
											</>
										)}
									</InputGroupButton>
								</TooltipTrigger>
								<TooltipContent>
									<p>{shouldShowRedoIcon ? "Làm lại" : "Gửi"}</p>
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
									: `Câu ${progress.completed}/${progress.total} đã hoàn thành · Đạt 70 điểm để vượt qua câu.`}
							</p>
						</div>
						<MyWallet className="py-0.5 ps-0.5 pe-2 bg-neutral-50" secondary />
					</div>
				</div>
			</div>

			{viewingFeedback && (
				<div className="w-full">
					<SentenceFeedback feedback={viewingFeedback} />
				</div>
			)}
		</div>
	);
}
