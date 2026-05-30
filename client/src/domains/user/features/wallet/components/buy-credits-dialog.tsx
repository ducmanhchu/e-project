import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading02Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import type { CheckoutResult } from "@/shared/types/payment";

import { useCheckout } from "@user/features/wallet/hooks/use-checkout";
import { useOrderPolling } from "@user/features/wallet/hooks/use-order-polling";
import { usePacks } from "@user/features/wallet/hooks/use-packs";
import {
	bonusPctForAmount,
	computeCustomCredits,
	isCustomAmountValid,
	parseVndInput,
} from "@/domains/user/features/wallet/utils/credit-utils";
import { CheckoutQrStep } from "@user/features/wallet/components/checkout-qr-step";
import { CreditPreview } from "@user/features/wallet/components/credit-preview";
import {
	PackSelector,
	type PackSelection,
} from "@user/features/wallet/components/pack-selector";

type BuyCreditsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type Step = "select" | "qr";

const DEFAULT_PACK_ID = "tier3";

const INITIAL_SELECTION: PackSelection = {
	kind: "pack",
	packId: DEFAULT_PACK_ID,
};

/**
 * Dialog mua xu 2 bước: chọn gói → quét QR và chờ xác nhận.
 * @param props.open — trạng thái mở dialog
 * @param props.onOpenChange — callback khi đóng/mở
 */
export function BuyCreditsDialog({
	open,
	onOpenChange,
}: BuyCreditsDialogProps) {
	const queryClient = useQueryClient();
	const paidHandledRef = useRef(false);

	const [step, setStep] = useState<Step>("select");
	const [selection, setSelection] = useState<PackSelection>(INITIAL_SELECTION);
	const [customAmount, setCustomAmount] = useState("");
	const [activeOrder, setActiveOrder] = useState<CheckoutResult | null>(null);
	const [expectedCredits, setExpectedCredits] = useState(0);
	const [expectedPrice, setExpectedPrice] = useState(0);

	const { data: catalog, isLoading: isPacksLoading } = usePacks(open);
	const checkout = useCheckout();
	const { data: orderStatus } = useOrderPolling(
		activeOrder?.orderCode ?? null,
		open && step === "qr" && activeOrder !== null,
	);

	const resetState = useCallback(() => {
		setStep("select");
		setSelection(INITIAL_SELECTION);
		setCustomAmount("");
		setActiveOrder(null);
		setExpectedCredits(0);
		setExpectedPrice(0);
		paidHandledRef.current = false;
	}, []);

	const preview = useMemo(() => {
		if (!catalog) return { credits: 0, bonusPct: 0, price: 0, valid: false };

		if (selection.kind === "pack") {
			const pack = catalog.packs.find((p) => p.id === selection.packId);
			if (!pack) return { credits: 0, bonusPct: 0, price: 0, valid: false };
			return {
				credits: pack.credits,
				bonusPct: pack.bonusPct,
				price: pack.price,
				valid: true,
			};
		}

		const amount = parseVndInput(customAmount);
		const valid = isCustomAmountValid(
			amount,
			catalog.custom.minAmount,
			catalog.custom.maxAmount,
		);
		if (!valid) {
			return { credits: 0, bonusPct: 0, price: 0, valid: false };
		}

		const bonusPct = bonusPctForAmount(amount, catalog.packs);
		const credits = computeCustomCredits(
			amount,
			catalog.custom.vndPerCredit,
			catalog.packs,
		);
		return { credits, bonusPct, price: amount, valid: true };
	}, [catalog, selection, customAmount]);

	const canCheckout =
		preview.valid &&
		!isPacksLoading &&
		!checkout.isPending &&
		step === "select";

	const handleOpenChange = (nextOpen: boolean) => {
		// Không cho đóng dialog khi đang ở bước QR — user phải quay lại hoặc chờ paid
		if (!nextOpen && step === "qr") return;
		onOpenChange(nextOpen);
	};

	const handleCheckout = async () => {
		if (!canCheckout || !catalog) return;

		try {
			const result =
				selection.kind === "pack"
					? await checkout.mutateAsync({
							type: "pack",
							packId: selection.packId,
						})
					: await checkout.mutateAsync({
							type: "custom",
							amount: preview.price,
						});

			setExpectedCredits(preview.credits);
			setExpectedPrice(preview.price);
			setActiveOrder(result);
			setStep("qr");
		} catch {
			// Lỗi đã được toast trong useCheckout
		}
	};

	const handleBackFromQr = () => {
		resetState();
	};

	useEffect(() => {
		if (
			!open ||
			step !== "qr" ||
			orderStatus?.status !== "paid" ||
			paidHandledRef.current
		) {
			return;
		}

		paidHandledRef.current = true;
		void queryClient.invalidateQueries({ queryKey: ["wallet", "balance"] });
		toast.success(
			`Nạp ${expectedCredits.toLocaleString("vi-VN")} xu thành công`,
		);
		onOpenChange(false);
	}, [
		open,
		step,
		orderStatus?.status,
		queryClient,
		expectedCredits,
		onOpenChange,
	]);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				showCloseButton={step === "select"}
				className="sm:max-w-xl"
				onInteractOutside={(e) => {
					if (step === "qr") e.preventDefault();
				}}
				onEscapeKeyDown={(e) => {
					if (step === "qr") e.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>
						{step === "select" ? "Mua xu để bắt đầu" : "Quét mã để thanh toán"}
					</DialogTitle>
					{step === "select" && (
						<DialogDescription>
							Xu được dùng để nộp câu trả lời cho phương pháp học.
						</DialogDescription>
					)}
				</DialogHeader>

				{step === "select" ? (
					<div className="flex flex-col gap-4">
						<PackSelector
							packs={catalog?.packs}
							customConfig={catalog?.custom}
							isLoading={isPacksLoading}
							selection={selection}
							customAmount={customAmount}
							onSelectPack={(packId) => setSelection({ kind: "pack", packId })}
							onSelectCustom={() => setSelection({ kind: "custom" })}
							onCustomAmountChange={setCustomAmount}
						/>

						{preview.valid && (
							<CreditPreview
								credits={preview.credits}
								bonusPct={preview.bonusPct}
							/>
						)}

						<Button
							type="button"
							className="w-full"
							disabled={!canCheckout}
							onClick={() => void handleCheckout()}
						>
							{checkout.isPending ? (
								<>
									<HugeiconsIcon
										icon={Loading02Icon}
										className="animate-spin"
									/>
									Đang tạo đơn...
								</>
							) : preview.valid ? (
								`Mua ${preview.credits.toLocaleString("vi-VN")} xu`
							) : (
								"Mua xu"
							)}
						</Button>
					</div>
				) : (
					activeOrder && (
						<CheckoutQrStep
							order={activeOrder}
							orderStatus={orderStatus}
							expectedCredits={expectedCredits}
							expectedPrice={expectedPrice}
							onBack={handleBackFromQr}
						/>
					)
				)}
			</DialogContent>
		</Dialog>
	);
}
