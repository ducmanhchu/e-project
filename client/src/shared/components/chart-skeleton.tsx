import { Skeleton } from "@shared/components/ui/skeleton";
import { cn } from "@shared/lib/utils";

type ChartSkeletonProps = {
	className?: string;
};

/**
 * Placeholder cố định chiều cao khi lazy load biểu đồ recharts.
 * @param className - Class bổ sung (ví dụ col-span)
 * @returns Skeleton chart
 */
export function ChartSkeleton({ className }: ChartSkeletonProps) {
	return (
		<Skeleton
			role="status"
			aria-busy="true"
			aria-label="Đang tải biểu đồ"
			className={cn("h-[280px] w-full rounded-xl", className)}
		/>
	);
}
