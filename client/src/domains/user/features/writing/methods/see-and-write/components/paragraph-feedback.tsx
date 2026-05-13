import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";

import type { SAWExercise } from "@shared/types/see-and-write";
import { Button } from "@shared/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@shared/components/ui/card";
import { cn, translateWritingCriteria } from "@shared/lib/utils";

type ParagraphResult = NonNullable<SAWExercise["lastSubmission"]>;

type ParagraphFeedbackProps = {
	result: ParagraphResult;
	onRetry: () => void;
};

export function ParagraphFeedback({ result, onRetry }: ParagraphFeedbackProps) {
	const { score, feedback, userAnswer } = result;
	const isPass = score >= 70;

	return (
		<div className="flex w-full min-w-0 flex-col gap-4 self-start">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-secondary-black text-base font-medium">
					Kết quả đánh giá
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
					<CardTitle>Đoạn văn của bạn</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-secondary-black text-base/7 text-justify whitespace-pre-line">
						{userAnswer}
					</p>
				</CardContent>
			</Card>

			{feedback.summary && (
				<Card>
					<CardHeader>
						<CardTitle>Nhận xét tổng quan</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-secondary-black text-base/7 text-justify">
							{feedback.summary}
						</p>
					</CardContent>
				</Card>
			)}

			{feedback.enhancedVersion && (
				<Card>
					<CardHeader>
						<CardTitle>Phiên bản gợi ý</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-green-800 text-base/7 text-justify whitespace-pre-line">
							{feedback.enhancedVersion}
						</p>
					</CardContent>
				</Card>
			)}

			{feedback.criteria?.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Tiêu chí đánh giá</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{feedback.criteria.map((c, idx) => (
							<div key={idx} className="flex flex-col gap-1">
								<div className="flex items-center justify-between gap-2">
									<span className="text-secondary-black text-sm font-medium">
										{translateWritingCriteria(c.name)}
									</span>
									<span className="text-sm">
										<span
											className={cn(
												"font-semibold",
												c.score / c.maxScore >= 0.7
													? "text-green-800"
													: "text-red-800",
											)}
										>
											{c.score}
										</span>
										<span className="text-muted-foreground">/{c.maxScore}</span>
									</span>
								</div>
								{c.comment && (
									<p className="text-muted-foreground text-sm text-justify">
										{c.comment}
									</p>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{feedback.corrections?.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Đề xuất chỉnh sửa</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{feedback.corrections.map((c, idx) => (
							<div key={idx} className="flex flex-col gap-1">
								<p className="text-sm">
									<span className="text-red-700 line-through me-2">
										{c.original}
									</span>
									<span className="text-green-800 font-medium">
										{c.suggestion}
									</span>
								</p>
								{c.explanation && (
									<p className="text-muted-foreground text-sm text-justify">
										{c.explanation}
									</p>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			)}

			<Button variant="blackHover" className="w-full" onClick={onRetry}>
				<HugeiconsIcon icon={RefreshIcon} />
				Làm lại bài tập
			</Button>
		</div>
	);
}
