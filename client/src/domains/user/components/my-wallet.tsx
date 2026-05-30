import { HugeiconsIcon } from "@hugeicons/react";
import { CoinbaseIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { lazy, Suspense, useState } from "react";

import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@shared/components/ui/tooltip";

import { cn } from "@shared/lib/utils";
import { useBalance } from "@user/features/wallet/hooks/use-balance";

const BuyCreditsDialog = lazy(() =>
	import("@user/features/wallet/components/buy-credits-dialog").then((m) => ({
		default: m.BuyCreditsDialog,
	})),
);

/**
 * Hiển thị số dư xu và mở dialog mua xu từ header.
 * @returns UI số dư xu kèm nút mua và dialog thanh toán.
 */
export function MyWallet({
	className,
	secondary,
}: {
	className?: string;
	secondary?: boolean;
}) {
	const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
	const { data: balance, isLoading: isBalanceLoading } = useBalance();

	if (isBalanceLoading) {
		return <Skeleton className="h-8 w-22 rounded-full" />;
	}

	return (
		<>
			<div
				className={cn(
					"flex items-center justify-between gap-2.5 bg-transparent rounded-full ps-1.5 pe-4 py-1 border",
					className,
				)}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant={secondary ? "outline" : "blackHover"}
							size="icon-xs"
							onClick={() => setBuyCreditsOpen(true)}
						>
							<HugeiconsIcon icon={PlusSignIcon} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Mua xu</p>
					</TooltipContent>
				</Tooltip>
				<div className="flex items-center gap-1.5">
					<HugeiconsIcon
						icon={CoinbaseIcon}
						className="size-4 text-yellow-600"
					/>
					<span className="text-black text-sm">{balance?.data.credits}</span>
				</div>
			</div>
			{buyCreditsOpen && (
				<Suspense fallback={null}>
					<BuyCreditsDialog
						open={buyCreditsOpen}
						onOpenChange={setBuyCreditsOpen}
					/>
				</Suspense>
			)}
		</>
	);
}
