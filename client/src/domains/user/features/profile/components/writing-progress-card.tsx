import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/shared/components/ui/chart";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { SummaryResponse } from "@/shared/types/profile";

import { InsufficientData } from "@user/features/profile/components/insufficient-data";
import {
	translateWritingLessonType,
	type WritingLessonType,
} from "@user/features/profile/utils/profile-display";

const chartConfig = {
	score: {
		label: "Điểm",
		color: "#0ea5e9",
	},
} satisfies ChartConfig;

type WritingStat = SummaryResponse["writingStats"][number];

type WritingProgressCardProps = {
	stat: WritingStat | undefined;
	lessonType: WritingLessonType;
	isLoading?: boolean;
};

/**
 * Thẻ tiến trình luyện viết: line chart 5 bài gần nhất.
 * @param props.stat — phần tử writingStats khớp lessonType
 * @param props.lessonType — ReverseTranslation | SeeWrite | Rewrite
 */
export function WritingProgressCard({
	stat,
	lessonType,
	isLoading = false,
}: WritingProgressCardProps) {
	const title = translateWritingLessonType(lessonType);
	const recentScores = stat?.recentScores ?? [];
	const hasEnoughData = recentScores.length >= 2;

	const chartData = recentScores.map((item, index) => ({
		index: index + 1,
		label: item.title ? `#${index + 1}` : `Bài ${index + 1}`,
		score: item.score,
	}));

	if (isLoading) {
		return (
			<Card>
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-1">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-64" />
					</div>
					<div className="flex gap-4">
						<Skeleton className="h-14 w-28" />
						<Skeleton className="h-14 w-28" />
					</div>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[220px] w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-1">
					<CardTitle className="text-base font-semibold">{title}</CardTitle>
					<CardDescription>
						Dựa trên điểm số của 5 bài tập gần nhất
					</CardDescription>
				</div>
				<div className="flex shrink-0 gap-4">
					<div className="flex flex-col gap-0.5">
						<span className="text-xs text-muted-foreground">
							Bài tập hoàn thành
						</span>
						<span className="text-xl font-bold tabular-nums">
							{stat?.totalCompleted ?? 0}
						</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-xs text-muted-foreground">
							Điểm trung bình
						</span>
						<span className="text-xl font-bold tabular-nums">
							{stat?.avgScore ?? 0}
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{hasEnoughData ? (
					<ChartContainer config={chartConfig} className="h-[220px] w-full">
						<LineChart
							data={chartData}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
							/>
							<YAxis
								domain={[0, 10]}
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								width={32}
							/>
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent hideLabel />}
							/>
							<Line
								type="monotone"
								dataKey="score"
								stroke="var(--color-score)"
								strokeWidth={2}
								dot={{ fill: "var(--color-score)", r: 4 }}
								activeDot={{ r: 6 }}
							/>
						</LineChart>
					</ChartContainer>
				) : (
					<InsufficientData />
				)}
			</CardContent>
		</Card>
	);
}
