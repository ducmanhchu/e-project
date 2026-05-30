import type { TransactionType } from "@shared/types/wallet";
import { translateTransactionType } from "@shared/lib/utils";
import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";
import { TRANSACTION_TYPE_BADGE_CLASS } from "@user/features/wallet/utils/transaction-display";

type TransactionTypeBadgeProps = {
	type: TransactionType;
};

/**
 * Badge loại giao dịch với màu theo spec.
 * @param props.type — loại giao dịch
 * @returns Badge đã dịch nhãn
 */
export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
	const badgeClass =
		TRANSACTION_TYPE_BADGE_CLASS[type] ?? "bg-muted text-muted-foreground";

	return (
		<Badge variant="outline" className={cn("border-transparent", badgeClass)}>
			{translateTransactionType(type)}
		</Badge>
	);
}
