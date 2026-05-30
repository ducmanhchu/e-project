import QRCode from "react-qr-code";

import { cn } from "@/shared/lib/utils";
import { isQrCodeImageUrl } from "@/domains/user/features/wallet/utils/credit-utils";

const QR_SIZE_PX = 192;

type PaymentQrDisplayProps = {
	qrCode: string;
	className?: string;
};

/**
 * Hiển thị mã QR thanh toán: URL ảnh (Sepay) hoặc render từ payload (ZaloPay EMVCo).
 * @param props.qrCode — URL ảnh hoặc chuỗi EMVCo từ provider
 */
export function PaymentQrDisplay({ qrCode, className }: PaymentQrDisplayProps) {
	if (isQrCodeImageUrl(qrCode)) {
		return (
			<img
				src={qrCode}
				alt="Mã QR chuyển khoản"
				className={cn("size-48 rounded-xl border border-border", className)}
			/>
		);
	}

	return (
		<div
			className={cn("rounded-xl border border-border bg-white p-3", className)}
		>
			<QRCode
				value={qrCode}
				size={QR_SIZE_PX}
				level="M"
				bgColor="#ffffff"
				fgColor="#000000"
			/>
		</div>
	);
}
