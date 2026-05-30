import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@/shared/components/ui/input-group";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import type { CreditPack, CustomAmountConfig } from "@/shared/types/payment";

import {
	formatVnd,
	isCustomAmountValid,
	parseVndInput,
} from "@/domains/user/features/wallet/utils/credit-utils";

export type PackSelection =
	| { kind: "pack"; packId: string }
	| { kind: "custom" };

const BEST_VALUE_PACK_ID = "tier3";

type PackSelectorProps = {
	packs: CreditPack[] | undefined;
	customConfig: CustomAmountConfig | undefined;
	isLoading: boolean;
	selection: PackSelection;
	customAmount: string;
	onSelectPack: (packId: string) => void;
	onSelectCustom: () => void;
	onCustomAmountChange: (value: string) => void;
};

/**
 * Hàng chọn gói xu (4 gói + tùy ý) và input số tiền khi chọn "Khác".
 */
export function PackSelector({
	packs,
	customConfig,
	isLoading,
	selection,
	customAmount,
	onSelectPack,
	onSelectCustom,
	onCustomAmountChange,
}: PackSelectorProps) {
	const parsedAmount = parseVndInput(customAmount);
	const customInvalid =
		selection.kind === "custom" &&
		customConfig &&
		parsedAmount !== null &&
		!isCustomAmountValid(
			parsedAmount,
			customConfig.minAmount,
			customConfig.maxAmount,
		);

	if (isLoading) {
		return (
			<div className="flex gap-2 overflow-x-auto sm:grid sm:grid-cols-5 sm:overflow-visible">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-16 min-w-18 shrink-0 rounded-2xl" />
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
				{packs?.map((pack) => {
					const isSelected =
						selection.kind === "pack" && selection.packId === pack.id;

					return (
						<Button
							key={pack.id}
							type="button"
							variant="outline"
							className={cn(
								"flex h-auto min-w-18 shrink-0 flex-col gap-1 px-2 py-3 sm:min-w-0",
								isSelected && "border-primary ring-2 ring-primary/30",
								pack.id === BEST_VALUE_PACK_ID && "border-secondary-green",
							)}
							onClick={() => onSelectPack(pack.id)}
						>
							<span className="text-xs font-semibold">
								{formatVnd(pack.price)}
							</span>
						</Button>
					);
				})}

				<Button
					type="button"
					variant="outline"
					className={cn(
						"flex h-auto min-w-18 shrink-0 flex-col gap-1 px-2 py-3 sm:min-w-0",
						selection.kind === "custom" &&
							"border-primary ring-2 ring-primary/30",
					)}
					onClick={onSelectCustom}
				>
					<span className="text-xs font-semibold">Khác</span>
				</Button>
			</div>

			{selection.kind === "custom" && customConfig && (
				<div className="flex flex-col gap-2">
					<Label htmlFor="custom-amount">
						Nhập số tiền (từ {formatVnd(customConfig.minAmount)} tới{" "}
						{formatVnd(customConfig.maxAmount)})
					</Label>
					<InputGroup>
						<InputGroupAddon align="inline-start">
							<InputGroupText>₫</InputGroupText>
						</InputGroupAddon>
						<InputGroupInput
							id="custom-amount"
							inputMode="numeric"
							placeholder={String(customConfig.minAmount)}
							value={customAmount}
							onChange={(e) => onCustomAmountChange(e.target.value)}
							aria-invalid={customInvalid || undefined}
						/>
					</InputGroup>
					{customInvalid && (
						<p className="text-xs text-destructive">
							Số tiền phải từ {formatVnd(customConfig.minAmount)} đến{" "}
							{formatVnd(customConfig.maxAmount)}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
