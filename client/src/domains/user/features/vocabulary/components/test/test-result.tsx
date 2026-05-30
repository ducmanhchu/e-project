import { Label, Pie, PieChart } from "recharts";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, Redo02Icon } from "@hugeicons/core-free-icons";

import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@shared/components/ui/chart";

import { EssayQuestionCard } from "@user/features/vocabulary/components/test/essay-question";
import { MultipleChoiceQuestionCard } from "@user/features/vocabulary/components/test/multiple-choice-question";
import { TrueFalseQuestionCard } from "@user/features/vocabulary/components/test/true-false-question";
import type {
	VocabQuestionResult,
	VocabTestSummary,
} from "@user/features/vocabulary/types/test";

const chartConfig = {
	correct: {
		label: "Đúng",
		color: "#00a63e",
	},
	incorrect: {
		label: "Sai",
		color: "#e7000b",
	},
	skipped: {
		label: "Bỏ qua",
		color: "var(--muted-foreground)",
	},
} satisfies ChartConfig;

type VocabTestResultProps = {
	summary: VocabTestSummary;
	results: VocabQuestionResult[];
	onRetryWrong: () => void;
	onBackToDeck: () => void;
	hasWrongQuestions: boolean;
	registerQuestionRef?: (index: number, node: HTMLElement | null) => void;
};

/**
 * Màn hình kết quả bài kiểm tra với biểu đồ donut và review từng câu.
 * @param props.summary - Thống kê tổng hợp
 * @param props.results - Kết quả từng câu
 * @param props.onRetryWrong - Làm lại câu sai
 * @param props.onBackToDeck - Quay về học phần
 * @param props.hasWrongQuestions - Có câu sai/bỏ qua để làm lại
 */
export function VocabTestResult({
	summary,
	results,
	onRetryWrong,
	onBackToDeck,
	hasWrongQuestions,
	registerQuestionRef,
}: VocabTestResultProps) {
	const chartData = [
		{ name: "correct", value: summary.correct, fill: "var(--color-correct)" },
		{
			name: "incorrect",
			value: summary.incorrect,
			fill: "var(--color-incorrect)",
		},
		{ name: "skipped", value: summary.skipped, fill: "var(--color-skipped)" },
	].filter((item) => item.value > 0);

	const totalQuestions = results.length;

	return (
		<div className="flex flex-col gap-8 max-w-5xl">
			<section className="flex flex-col gap-4 items-center rounded-2xl border bg-neutral-50 p-6">
				<h2 className="text-xl font-medium">Kết quả bài kiểm tra</h2>

				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square max-h-[220px] w-full max-w-[220px]"
				>
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Pie
							data={chartData}
							dataKey="value"
							nameKey="name"
							innerRadius={60}
							strokeWidth={4}
							stroke="transparent"
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="middle"
											>
												<tspan
													x={viewBox.cx}
													y={viewBox.cy}
													className="fill-foreground text-3xl font-bold"
												>
													{summary.accuracyPercent}%
												</tspan>
											</text>
										);
									}
									return null;
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>

				<div className="flex gap-3">
					<Badge variant="outline" className="border-green-600 text-green-600">
						Đúng {summary.correct}
					</Badge>
					<Badge variant="outline" className="border-red-600 text-red-600">
						Sai {summary.incorrect}
					</Badge>
					{summary.skipped > 0 ? (
						<Badge variant="outline" className="text-muted-foreground">
							Bỏ qua {summary.skipped}
						</Badge>
					) : null}
				</div>

				<div className="flex gap-2 mt-4">
					{hasWrongQuestions ? (
						<Button variant="blackHover" onClick={onRetryWrong}>
							<HugeiconsIcon icon={Redo02Icon} className="size-4" />
							<span>Làm lại các câu sai</span>
						</Button>
					) : null}
					<Button variant="outline" onClick={onBackToDeck}>
						<HugeiconsIcon icon={ArrowRight02Icon} className="size-4" />
						Quay lại học phần
					</Button>
				</div>
			</section>

			<section className="flex flex-col gap-4">
				<h3 className="text-lg font-semibold">Đáp án của bạn</h3>
				<div className="flex flex-col gap-6">
					{results.map((result, index) => {
						const { question, userAnswer, status } = result;

						const card = (() => {
							if (question.type === "tf") {
								return (
									<TrueFalseQuestionCard
										question={question}
										index={index}
										total={totalQuestions}
										mode="review"
										userAnswer={userAnswer}
										status={status}
									/>
								);
							}

							if (question.type === "mc") {
								return (
									<MultipleChoiceQuestionCard
										question={question}
										index={index}
										total={totalQuestions}
										mode="review"
										userAnswer={userAnswer}
										status={status}
									/>
								);
							}

							return (
								<EssayQuestionCard
									question={question}
									index={index}
									total={totalQuestions}
									mode="review"
									userAnswer={userAnswer}
									status={status}
								/>
							);
						})();

						return (
							<div
								key={question.id}
								ref={(node) => registerQuestionRef?.(index, node)}
								className="scroll-mt-4"
							>
								{card}
							</div>
						);
					})}
				</div>
			</section>
		</div>
	);
}
