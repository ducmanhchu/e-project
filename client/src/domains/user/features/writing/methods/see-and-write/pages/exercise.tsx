import { useParams, useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowLeft02Icon,
	ArrowUp02Icon,
	Loading03Icon,
} from "@hugeicons/core-free-icons";

import type { ExerciseLevel, WritingExerciseTopic } from "@shared/types/utils";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import { ExerciseLevelBadge } from "@user/components/exercise-level-badge";
import { KeywordPool } from "@user/features/writing/methods/see-and-write/components/keyword-pool";
import { ParagraphInput } from "@user/features/writing/methods/see-and-write/components/paragraph-input";
import { ParagraphFeedback } from "@user/features/writing/methods/see-and-write/components/paragraph-feedback";
import { translateTopic } from "@shared/lib/utils";
import { queryClient } from "@shared/lib/query-client";
import { useSeeAndWrite } from "@user/features/writing/methods/see-and-write/hooks/use-see-and-write";

export function SeeAndWriteExercise() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const {
		exercise,
		isLoading,
		currentStep,
		selectedKeywordIds,
		toggleKeyword,
		isKeywordDisabled,
		canSubmitKeywords,
		isSubmittingKeywords,
		handleSubmitKeywords,
		getKeywordStatus,
		paragraph,
		setParagraph,
		paragraphValidation,
		isSubmittingParagraph,
		handleSubmitParagraph,
		paragraphResult,
		handleRetry,
		isResetting,
	} = useSeeAndWrite(id as string);

	const handleBack = () => {
		queryClient.invalidateQueries({ queryKey: ["see-and-write", "list"] });
		navigate(-1);
	};

	return (
		<div className="flex flex-col gap-4 w-full min-h-dvh py-8 px-4 md:px-10 lg:px-20">
			<div className="flex justify-between">
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

			{isLoading ? (
				<Skeleton className="h-6 w-64 self-center" />
			) : (
				<h1 className="self-center text-secondary-black text-xl font-medium">
					{exercise?.title}
				</h1>
			)}

			<div className="flex w-full min-w-0 max-w-4xl flex-col items-center gap-10 self-center">
				{isLoading ? (
					<Skeleton className="rounded-2xl aspect-3/2 w-full" />
				) : (
					<img
						src={exercise?.image}
						alt={exercise?.title}
						className="rounded-2xl border border-secondary-black object-cover aspect-3/2 w-full"
					/>
				)}

				<KeywordPool
					wordPool={exercise?.wordPool}
					step={currentStep}
					requiredKeywordCount={exercise?.requiredKeywordCount ?? 0}
					selectedCount={selectedKeywordIds.size}
					isLoading={isLoading}
					isSelected={(kId) => selectedKeywordIds.has(kId)}
					isDisabled={isKeywordDisabled}
					getStatus={getKeywordStatus}
					onToggle={toggleKeyword}
				/>

				{/* Bước 1*/}
				{currentStep === "select" && !isLoading && (
					<Button
						variant="blackHover"
						className="w-full"
						onClick={handleSubmitKeywords}
						disabled={!canSubmitKeywords || isSubmittingKeywords}
					>
						{isSubmittingKeywords ? (
							<>
								<HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
								Đang kiểm tra...
							</>
						) : (
							<>
								<HugeiconsIcon icon={ArrowUp02Icon} />
								Nộp từ khóa
							</>
						)}
					</Button>
				)}

				{/* Bước 2 */}
				{currentStep === "writing" && (
					<ParagraphInput
						value={paragraph}
						onChange={setParagraph}
						onSubmit={handleSubmitParagraph}
						validation={paragraphValidation}
						minWordCount={exercise?.minWordCount ?? 0}
						maxWordCount={exercise?.maxWordCount ?? 0}
						isSubmitting={isSubmittingParagraph}
					/>
				)}

				{/* Bước 3 */}
				{currentStep === "viewing" && paragraphResult && (
					<ParagraphFeedback
						result={paragraphResult}
						onRetry={handleRetry}
						isResetting={isResetting}
					/>
				)}
			</div>
		</div>
	);
}
