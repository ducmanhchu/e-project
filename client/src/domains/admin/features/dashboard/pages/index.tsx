import { useState } from "react";
import {
	Invoice01Icon,
	MoneyBag01Icon,
	UserDollarIcon,
	UserIcon,
} from "@hugeicons/core-free-icons";

import { StatCard } from "@admin/features/dashboard/components/stat-card";
import { UserGrowthChart } from "@admin/features/dashboard/components/user-growth-chart";
import {
	useAdminSummary,
	type GrowthRange,
} from "@admin/features/dashboard/hooks/use-admin-summary";
import { formatCount, formatVnd } from "@admin/features/dashboard/utils/format";

const pageHeader = (
	<div className="flex flex-col gap-1">
		<h1 className="text-xl font-bold">Thống kê</h1>
		<p className="text-sm text-muted-foreground">
			Tổng quan doanh thu, giao dịch và tăng trưởng người dùng.
		</p>
	</div>
);

/**
 * Trang dashboard thống kê admin: bento grid 4 chỉ số + biểu đồ tăng trưởng.
 * @returns Trang Dashboard
 */
export function Dashboard() {
	const [range, setRange] = useState<GrowthRange>("week");
	const { data, isLoading, isError } = useAdminSummary(range);

	return (
		<div className="flex flex-col gap-6">
			{pageHeader}

			{isError ? (
				<p className="text-sm text-muted-foreground">
					Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
				</p>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Doanh thu"
						value={formatVnd(data?.revenueVND ?? 0)}
						icon={MoneyBag01Icon}
						isLoading={isLoading}
					/>
					<StatCard
						title="Lượng giao dịch"
						value={formatCount(data?.transactionCount ?? 0)}
						icon={Invoice01Icon}
						isLoading={isLoading}
					/>
					<StatCard
						title="Người dùng miễn phí"
						value={formatCount(data?.totalUsers ?? 0)}
						icon={UserIcon}
						isLoading={isLoading}
					/>
					<StatCard
						title="Người dùng trả phí"
						value={formatCount(data?.payingUsers ?? 0)}
						icon={UserDollarIcon}
						isLoading={isLoading}
					/>
					<UserGrowthChart
						className="col-span-full"
						data={data?.userGrowth ?? []}
						range={range}
						onRangeChange={setRange}
						isLoading={isLoading}
					/>
				</div>
			)}
		</div>
	);
}
