import { HugeiconsIcon } from "@hugeicons/react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

type StatCardProps = {
	title: string;
	value: string;
	icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
	isLoading?: boolean;
	className?: string;
};

/**
 * Thẻ chỉ số trong bento grid dashboard admin.
 * @param props.title — nhãn chỉ số
 * @param props.value — giá trị đã format
 * @param props.icon — icon Hugeicons
 * @param props.isLoading — hiện skeleton khi đang tải
 * @returns Card chỉ số
 */
export function StatCard({
	title,
	value,
	icon,
	isLoading = false,
	className,
}: StatCardProps) {
	return (
		<Card className={cn(className)}>
			<CardContent className="flex flex-col gap-3">
				<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
					<HugeiconsIcon icon={icon} className="size-5" />
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-sm text-muted-foreground">{title}</p>
					{isLoading ? (
						<Skeleton className="h-8 w-28" />
					) : (
						<p className="text-2xl font-bold tabular-nums">{value}</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
