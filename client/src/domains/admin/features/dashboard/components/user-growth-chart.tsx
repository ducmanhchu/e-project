import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
	Card,
	CardAction,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { AdminSummaryResponse } from "@/shared/types/progress";
import type { GrowthRange } from "@admin/features/dashboard/hooks/use-admin-summary";
import { formatPeriodLabel } from "@admin/features/dashboard/utils/format";

const chartConfig = {
	newUsers: {
		label: "Người dùng mới",
		color: "#0ea5e9",
	},
} satisfies ChartConfig;

const RANGE_OPTIONS: { value: GrowthRange; label: string }[] = [
	{ value: "week", label: "Tuần" },
	{ value: "month", label: "Tháng" },
	{ value: "all", label: "Toàn thời gian" },
];

type UserGrowthChartProps = {
	data: AdminSummaryResponse["userGrowth"];
	range: GrowthRange;
	onRangeChange: (range: GrowthRange) => void;
	isLoading?: boolean;
	className?: string;
};

/**
 * Biểu đồ area tăng trưởng người dùng với bộ lọc tuần/tháng/toàn thời gian.
 * @param props.data — mảng userGrowth từ API
 * @param props.range — khoảng lọc hiện tại
 * @param props.onRangeChange — callback đổi khoảng
 * @returns Card chứa area chart
 */
export function UserGrowthChart({
	data,
	range,
	onRangeChange,
	isLoading = false,
	className,
}: UserGrowthChartProps) {
	const chartData = data.map((row) => ({
		periodStart: row.periodStart,
		periodLabel: formatPeriodLabel(row.periodStart, range),
		newUsers: row.newUsers,
	}));

	const hasData = chartData.length > 0;

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[280px] w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader className="border-b">
				<CardTitle className="text-base font-semibold">
					Tăng trưởng người dùng
				</CardTitle>
				<CardDescription>
					Số người dùng mới đăng ký theo từng kỳ
				</CardDescription>
				<CardAction>
					<Select
						value={range}
						onValueChange={(v) => onRangeChange(v as GrowthRange)}
					>
						<SelectTrigger size="sm" className="w-[160px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{RANGE_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>
			<CardContent>
				{hasData ? (
					<ChartContainer config={chartConfig} className="h-[280px] w-full">
						<AreaChart
							data={chartData}
							margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient id="fillNewUsers" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-newUsers)"
										stopOpacity={0.8}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-newUsers)"
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="periodLabel"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								minTickGap={32}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								width={40}
								allowDecimals={false}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										indicator="line"
										labelFormatter={(_, payload) => {
											const row = payload?.[0]?.payload as
												| { periodStart?: string }
												| undefined;
											if (!row?.periodStart) return "";
											return formatPeriodLabel(row.periodStart, range);
										}}
									/>
								}
							/>
							<Area
								type="monotone"
								dataKey="newUsers"
								stroke="var(--color-newUsers)"
								fill="url(#fillNewUsers)"
								strokeWidth={2}
							/>
						</AreaChart>
					</ChartContainer>
				) : (
					<p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
						Chưa có dữ liệu trong khoảng thời gian này.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
