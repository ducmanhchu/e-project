import { HugeiconsIcon } from "@hugeicons/react";
import { CoinbaseIcon } from "@hugeicons/core-free-icons";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

type BalanceCardProps = {
	credits: number | undefined;
	isLoading?: boolean;
};

/**
 * Thẻ hiển thị số dư xu.
 * @param props.credits — từ useFetchMe
 * @param props.isLoading — hiện skeleton khi đang tải
 */
export function BalanceCard({ credits, isLoading = false }: BalanceCardProps) {
	return (
		<Card className="bg-secondary-yellow">
			<CardHeader>
				<CardTitle className="text-sm">Số dư</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center gap-2.5">
				{isLoading ? (
					<Skeleton className="h-9 w-24" />
				) : (
					<>
						<HugeiconsIcon icon={CoinbaseIcon} className="size-5" />
						<span className="text-xl font-bold">{credits ?? 0}</span>
					</>
				)}
			</CardContent>
		</Card>
	);
}
