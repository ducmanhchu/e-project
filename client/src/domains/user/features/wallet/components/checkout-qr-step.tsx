import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/shared/components/ui/button";
import { ShimmeringText } from "@/shared/components/ui/shimmering-text";
import type { CheckoutResult, OrderStatus } from "@/shared/types/payment";

import { PaymentQrDisplay } from "@/domains/user/features/wallet/components/payment-qr-display";
import { formatVnd } from "@/domains/user/features/wallet/utils/credit-utils";

type CheckoutQrStepProps = {
	order: CheckoutResult;
	orderStatus: OrderStatus | undefined;
	expectedCredits: number;
	expectedPrice: number;
	onBack: () => void;
};

/**
 * Format thời gian còn lại thành mm:ss.
 * @param ms — milliseconds còn lại
 */
function formatCountdown(ms: number): string {
	const totalSec = Math.max(0, Math.floor(ms / 1000));
	const min = Math.floor(totalSec / 60);
	const sec = totalSec % 60;
	return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Bước QR: quét mã chuyển khoản, countdown và trạng thái chờ xác nhận.
 */
export function CheckoutQrStep({
	order,
	orderStatus,
	expectedCredits,
	expectedPrice,
	onBack,
}: CheckoutQrStepProps) {
	const [remainingMs, setRemainingMs] = useState(() =>
		Math.max(0, new Date(order.expiresAt).getTime() - Date.now()),
	);

	useEffect(() => {
		const tick = () => {
			setRemainingMs(
				Math.max(0, new Date(order.expiresAt).getTime() - Date.now()),
			);
		};
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [order.expiresAt]);

	const status = orderStatus?.status ?? "pending";
	const isExpired =
		status === "expired" ||
		status === "cancelled" ||
		(status === "pending" && remainingMs <= 0);

	return (
		<div className="flex flex-col items-center gap-5">
			{!isExpired && (
				<>
					<PaymentQrDisplay qrCode={order.qrCode} />
					{order.provider === "zalopay" && order.checkoutUrl && (
						<Button variant="outline" size="sm" asChild>
							<a
								href={order.checkoutUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								Chi tiết hóa đơn
							</a>
						</Button>
					)}
				</>
			)}

			<div className="w-full space-y-1 text-center text-sm">
				<p>
					Số tiền:{" "}
					<span className="font-semibold">{formatVnd(expectedPrice)}</span>
				</p>
				<p>
					Nhận:{" "}
					<span className="font-semibold">
						{expectedCredits.toLocaleString("vi-VN")} xu
					</span>
				</p>
				<p className="text-muted-foreground">
					Mã đơn: <span className="font-mono">{order.orderCode}</span>
				</p>
			</div>

			{!isExpired && (
				<div className="flex flex-col items-center justify-center gap-1">
					<p className="text-sm text-muted-foreground">
						Thời gian còn lại:{" "}
						<span className="font-mono font-medium text-foreground">
							{formatCountdown(remainingMs)}
						</span>
					</p>
					<div className="flex gap-1.5 items-center">
						<HugeiconsIcon
							icon={Alert01Icon}
							className="size-4 text-destructive"
						/>
						<p className="text-sm text-destructive">
							Giao dịch không thể hoàn trả
						</p>
					</div>
				</div>
			)}

			{isExpired ? (
				<div className="flex w-full flex-col items-center gap-3">
					<p className="text-sm text-destructive">
						{status === "cancelled"
							? "Đơn hàng đã bị hủy."
							: "Đơn hàng đã hết hạn."}
					</p>
					<Button type="button" variant="outline" onClick={onBack}>
						Quay lại
					</Button>
				</div>
			) : (
				<div className="flex items-center gap-2 text-sm">
					<ShimmeringText text="Đang chờ xác nhận thanh toán..." />
				</div>
			)}

			{!isExpired && (
				<Button type="button" variant="ghost" size="sm" onClick={onBack}>
					Quay lại
				</Button>
			)}
		</div>
	);
}
