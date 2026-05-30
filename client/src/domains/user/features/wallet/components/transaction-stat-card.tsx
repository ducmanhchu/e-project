import type { ReactNode } from "react";

import { cn } from "@shared/lib/utils";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@shared/components/ui/card";
import { Skeleton } from "@shared/components/ui/skeleton";

type TransactionStatCardProps = {
	label: string;
	value: ReactNode;
	isLoading?: boolean;
	className?: string;
	icon?: ReactNode;
};

/**
 * Thẻ thống kê trong bento grid trang giao dịch.
 * @param props.label — nhãn thẻ
 * @param props.value — giá trị hiển thị
 * @param props.isLoading — hiện skeleton khi đang tải
 * @param props.className — class bổ sung cho Card
 * @param props.icon — icon tuỳ chọn bên cạnh giá trị
 * @returns Card thống kê
 */
export function TransactionStatCard({
	label,
	value,
	isLoading = false,
	className,
	icon,
}: TransactionStatCardProps) {
	return (
		<Card className={cn(className)}>
			<CardHeader>
				<CardTitle className="text-sm font-normal">{label}</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center gap-2.5">
				{isLoading ? (
					<Skeleton className="h-9 w-24" />
				) : (
					<>
						{icon}
						<span className="text-2xl font-bold">{value}</span>
					</>
				)}
			</CardContent>
		</Card>
	);
}
