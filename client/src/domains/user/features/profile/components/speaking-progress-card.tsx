import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

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

const chartConfig = {
	score: {
		label: "Điểm",
		color: "#0ea5e9",
	},
} satisfies ChartConfig;

const RADAR_AXES: {
	key: keyof SummaryResponse["slangStats"]["avgScores"];
	label: string;
}[] = [
	{ key: "accuracyScore", label: "Độ chính xác" },
	{ key: "fluencyScore", label: "Độ trôi chảy" },
	{ key: "completenessScore", label: "Tính đầy đủ" },
	{ key: "pronunciationScore", label: "Phát âm" },
	{ key: "prosodyScore", label: "Ngữ điệu" },
];

type SpeakingProgressCardProps = {
	slangStats: SummaryResponse["slangStats"] | undefined;
	isLoading?: boolean;
};

/**
 * Thẻ tiến trình luyện nói: radar chart điểm trung bình theo tiêu chí.
 * @param props.slangStats — từ fetchSummary
 */
export function SpeakingProgressCard({
	slangStats,
	isLoading = false,
}: SpeakingProgressCardProps) {
	const totalCompleted = slangStats?.totalCompleted ?? 0;
	const hasEnoughData = totalCompleted > 0;

	const chartData = RADAR_AXES.map(({ key, label }) => ({
		criterion: label,
		score: slangStats?.avgScores[key] ?? 0,
	}));

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-32" />
				</CardHeader>
				<CardContent>
					<Skeleton className="mx-auto aspect-square max-h-[280px] w-full max-w-[320px]" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="border-b">
				<div className="flex items-center justify-between">
					<div className="flex flex-col items-start gap-1">
						<CardTitle className="text-base font-semibold">
							Phương pháp Hội thoại
						</CardTitle>
						<CardDescription>
							Điểm trung bình theo từng tiêu chí đánh giá
						</CardDescription>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">
							Bài tập hoàn thành
						</span>
						<span className="text-xl font-bold tabular-nums">
							{totalCompleted}
						</span>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{hasEnoughData ? (
					<ChartContainer
						config={chartConfig}
						className="mx-auto aspect-square max-h-[280px] w-full max-w-[400px]"
					>
						<RadarChart data={chartData}>
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent hideLabel />}
							/>
							<PolarAngleAxis dataKey="criterion" />
							<PolarGrid />
							<Radar
								dataKey="score"
								fill="var(--color-score)"
								fillOpacity={0.5}
								stroke="var(--color-score)"
								dot={{ fill: "var(--color-score)", r: 4 }}
							/>
						</RadarChart>
					</ChartContainer>
				) : (
					<InsufficientData />
				)}
			</CardContent>
		</Card>
	);
}
