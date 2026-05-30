import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

import { cn } from "@/shared/lib/utils";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

type StatCardProps = {
	label: string;
	value: number | undefined;
	icon: IconSvgElement;
	isLoading?: boolean;
	className?: string;
};

/**
 * Thẻ thống kê tái dùng (chuỗi, bài hoàn thành, học phần).
 * @param props.label — nhãn thẻ
 * @param props.value — giá trị số
 * @param props.icon — icon Hugeicons
 * @param props.isLoading — hiện skeleton khi đang tải
 */
export function StatCard({
	label,
	value,
	icon,
	isLoading = false,
	className,
}: StatCardProps) {
	return (
		<Card className={cn(className)}>
			<CardHeader>
				<CardTitle className="text-sm">{label}</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center gap-2.5">
				{isLoading ? (
					<Skeleton className="h-9 w-16" />
				) : (
					<>
						<HugeiconsIcon icon={icon} className="size-5" />
						<span className="text-xl font-bold">{value ?? 0}</span>
					</>
				)}
			</CardContent>
		</Card>
	);
}
