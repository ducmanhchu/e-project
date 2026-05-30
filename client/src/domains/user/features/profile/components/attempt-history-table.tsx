import { useState } from "react";
import { useNavigate } from "react-router";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import type { AttemptHistoryParams } from "@/shared/types/progress";

import { useAttemptHistory } from "@user/features/profile/hooks/use-attempt-history";
import {
	formatCompletedAt,
	getExercisePath,
	isHistoryRowVisible,
	translateLessonKind,
} from "@user/features/profile/utils/profile-display";

type FeatureFilter = NonNullable<AttemptHistoryParams["feature"]>;

const FEATURE_TABS: { value: FeatureFilter; label: string }[] = [
	{ value: "all", label: "Tất cả" },
	{ value: "writing", label: "Kỹ năng viết" },
	{ value: "slanghang", label: "Kỹ năng nói" },
];

/**
 * Bảng lịch sử làm bài có lọc theo kỹ năng.
 */
export function AttemptHistoryTable() {
	const navigate = useNavigate();
	const [feature, setFeature] = useState<FeatureFilter>("all");
	const { data: items, isLoading, isError } = useAttemptHistory(feature);

	const visibleRows = (items ?? []).filter((row) =>
		isHistoryRowVisible(row.kind),
	);

	return (
		<Card>
			<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<CardTitle className="text-base font-semibold">
					Lịch sử làm bài
				</CardTitle>
				<Tabs
					value={feature}
					onValueChange={(v) => setFeature(v as FeatureFilter)}
				>
					<TabsList variant="line">
						{FEATURE_TABS.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex flex-col gap-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full" />
						))}
					</div>
				) : isError ? (
					<p className="text-sm text-destructive">
						Không tải được lịch sử. Vui lòng thử lại sau.
					</p>
				) : visibleRows.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						Chưa có bài tập nào trong mục này.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Tiêu đề</TableHead>
								<TableHead>Dạng bài</TableHead>
								<TableHead>Điểm</TableHead>
								<TableHead>Thời gian</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{visibleRows.map((row) => {
								const path = getExercisePath(row.kind, row.id);
								const title = row.title ?? "—";

								return (
									<TableRow key={`${row.kind}-${row.id}-${row.completedAt}`}>
										<TableCell className="max-w-[240px]">
											{path ? (
												<button
													type="button"
													className="truncate text-left underline underline-offset-2 hover:text-primary"
													onClick={() => navigate(path)}
												>
													{title}
												</button>
											) : (
												<span className="truncate">{title}</span>
											)}
										</TableCell>
										<TableCell>{translateLessonKind(row.kind)}</TableCell>
										<TableCell>{row.score != null ? row.score : "—"}</TableCell>
										<TableCell>{formatCompletedAt(row.completedAt)}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
