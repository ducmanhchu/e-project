import { useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

import type { ParaphraseExercise } from "@shared/types/paraphrase";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@shared/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { cn } from "@shared/lib/utils";

type SentenceFeedbackValue = {
	order: number;
	userAnswer: string;
	score: number;
	feedback: NonNullable<
		ParaphraseExercise["sentences"][number]["lastSubmission"]
	>["feedback"];
};

type SentenceFeedbackProps = {
	feedback: SentenceFeedbackValue;
};

export function SentenceFeedback({ feedback }: SentenceFeedbackProps) {
	const { score, userAnswer, feedback: detail } = feedback;
	const isPass = score >= 70;

	// Loại bỏ ký tự markdown thô **...** và các block (...) trong suggestion
	const standardSuggestion = useCallback((input: string) => {
		let cleaned = input.replace(/\*\*(.*?)\*\*/g, "$1");
		cleaned = cleaned.replace(/\([^)]*\)/g, "");
		return cleaned.replace(/\s+/g, " ").trim();
	}, []);

	return (
		<div className="flex w-full min-w-0 flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-secondary-black text-base font-medium">
					Kết quả đánh giá ·{" "}
					<span className={cn(isPass ? "text-green-800" : "text-red-800")}>
						{isPass ? "Đạt" : "Không đạt"}
					</span>
				</h2>
				<div className="flex items-center gap-2 px-4 py-2 rounded-2xl border bg-neutral-50">
					<span className="text-muted-foreground text-sm">Điểm:</span>
					<span
						className={cn(
							"text-3xl font-black",
							isPass ? "text-green-800" : "text-red-800",
						)}
					>
						{score}
					</span>
					<span className="text-secondary-black text-sm">/100</span>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Đáp án của bạn</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-secondary-black text-base/7 text-justify whitespace-pre-line">
						{userAnswer}
					</p>
				</CardContent>
			</Card>

			{detail.suggestion &&
				(isPass ? (
					<Card>
						<CardHeader>
							<CardTitle>Đáp án gợi ý</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-green-800 text-base/7 text-justify">
								{standardSuggestion(detail.suggestion)}
							</p>
						</CardContent>
					</Card>
				) : (
					<Collapsible className="group/collapsible">
						<Card>
							<CollapsibleTrigger className="w-full text-left cursor-pointer">
								<CardHeader className="flex flex-row items-center justify-between gap-2">
									<CardTitle>Xem đáp án gợi ý</CardTitle>
									<HugeiconsIcon
										icon={ArrowDown01Icon}
										className="text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180"
									/>
								</CardHeader>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<CardContent>
									<p className="text-green-800 text-base/7 text-justify">
										{standardSuggestion(detail.suggestion)}
									</p>
								</CardContent>
							</CollapsibleContent>
						</Card>
					</Collapsible>
				))}

			{isPass && detail.modelAnswer && (
				<Card>
					<CardHeader>
						<CardTitle>Đáp án mẫu</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-green-800 text-base/7 text-justify whitespace-pre-line">
							{detail.modelAnswer}
						</p>
					</CardContent>
				</Card>
			)}

			{detail.improvements?.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Cần cải thiện</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="list-disc list-inside flex flex-col gap-2">
							{detail.improvements.map((item, idx) => (
								<li
									key={idx}
									className="text-secondary-black text-base/7 text-justify"
								>
									{item}
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{detail.comment && (
				<Card>
					<CardHeader>
						<CardTitle>Nhận xét</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-secondary-black text-base/7 text-justify">
							{detail.comment}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
