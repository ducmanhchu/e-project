import { useParams, useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowLeft02Icon,
	ArrowUp02Icon,
	Redo02Icon,
	Loading03Icon,
	HelpCircleIcon,
} from "@hugeicons/core-free-icons";

import type { WritingExerciseTopic, ExerciseLevel } from "@shared/types/utils";

import { queryClient } from "@shared/lib/query-client";
import { cn, translateTopic } from "@shared/lib/utils";

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

import { useParaphrase } from "@user/features/writing/methods/paraphrase/hooks/use-paraphrase";
import { SentenceFeedback } from "@user/features/writing/methods/paraphrase/components/sentence-feedback";

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
		canSubmit,
		isViewingCompleted,
		isInputDisabled,
		shouldShowRedoIcon,
		isLoading,
		isSubmitting,
	} = useParaphrase(id as string);

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
						<h1 className="text-xl font-medium flex-1 text-center">
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
							<Tooltip>
								<TooltipTrigger asChild>
									<InputGroupButton
										variant="blackHover"
										size="icon-sm"
										onClick={shouldShowRedoIcon ? handleRedo : handleSubmit}
										disabled={
											isLoading ||
											isSubmitting ||
											(shouldShowRedoIcon ? false : !canSubmit)
										}
									>
										{isSubmitting ? (
											<HugeiconsIcon
												icon={Loading03Icon}
												className="animate-spin"
											/>
										) : (
											<HugeiconsIcon
												icon={shouldShowRedoIcon ? Redo02Icon : ArrowUp02Icon}
											/>
										)}
									</InputGroupButton>
								</TooltipTrigger>
								<TooltipContent>
									<p>{shouldShowRedoIcon ? "Làm lại" : "Gửi"}</p>
								</TooltipContent>
							</Tooltip>
						</InputGroupAddon>
					</InputGroup>
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
