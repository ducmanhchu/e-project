import { lazy, Suspense } from "react";
import {
	Cards01Icon,
	Fire03Icon,
	NoteDoneIcon,
} from "@hugeicons/core-free-icons";

import { useFetchMe } from "@/shared/hooks/use-fetch-me";
import { ChartSkeleton } from "@shared/components/chart-skeleton";

import { AttemptHistoryTable } from "@user/features/profile/components/attempt-history-table";
import { BalanceCard } from "@user/features/profile/components/balance-card";
import { StatCard } from "@user/features/profile/components/stat-card";
import { UserInfoCard } from "@user/features/profile/components/user-info-card";
import { useSummary } from "@user/features/profile/hooks/use-summary";
import { WRITING_LESSON_TYPES } from "@user/features/profile/utils/profile-display";

const SpeakingProgressCard = lazy(() =>
	import("@user/features/profile/components/speaking-progress-card").then(
		(m) => ({ default: m.SpeakingProgressCard }),
	),
);

const WritingProgressCard = lazy(() =>
	import("@user/features/profile/components/writing-progress-card").then(
		(m) => ({ default: m.WritingProgressCard }),
	),
);

/**
 * Trang thông tin cá nhân — bento grid tiến trình và lịch sử.
 * @returns Trang Profile
 */
export function Profile() {
	const { data: user, isLoading: isUserLoading } = useFetchMe();
	const { data: summary, isLoading: isSummaryLoading } = useSummary();

	const getWritingStat = (lessonType: (typeof WRITING_LESSON_TYPES)[number]) =>
		summary?.writingStats.find((s) => s.lessonType === lessonType);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-extrabold md:text-4xl">
					Thông tin cá nhân
				</h1>
				<p className="text-sm md:text-base">
					Quản lý thông tin cá nhân và theo dõi tiến trình học tập của bạn.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="md:col-span-2">
					<UserInfoCard user={user} isLoading={isUserLoading} />
				</div>
				<div className="md:col-span-1">
					<BalanceCard credits={user?.credits} isLoading={isUserLoading} />
				</div>

				<StatCard
					label="Chuỗi"
					value={summary?.currentStreak}
					icon={Fire03Icon}
					isLoading={isSummaryLoading}
					className="bg-secondary-orange"
				/>
				<StatCard
					label="Bài tập hoàn thành"
					value={summary?.totalCompletedExercises}
					icon={NoteDoneIcon}
					isLoading={isSummaryLoading}
					className="bg-secondary-green"
				/>
				<StatCard
					label="Học phần"
					value={summary?.totalDecks}
					icon={Cards01Icon}
					isLoading={isSummaryLoading}
					className="bg-secondary-blue"
				/>

				{WRITING_LESSON_TYPES.map((lessonType) => (
					<div key={lessonType} className="md:col-span-3">
						<Suspense fallback={<ChartSkeleton />}>
							<WritingProgressCard
								lessonType={lessonType}
								stat={getWritingStat(lessonType)}
								isLoading={isSummaryLoading}
							/>
						</Suspense>
					</div>
				))}

				<div className="md:col-span-3">
					<Suspense fallback={<ChartSkeleton />}>
						<SpeakingProgressCard
							slangStats={summary?.slangStats}
							isLoading={isSummaryLoading}
						/>
					</Suspense>
				</div>

				<div className="md:col-span-3">
					<AttemptHistoryTable />
				</div>
			</div>
		</div>
	);
}
