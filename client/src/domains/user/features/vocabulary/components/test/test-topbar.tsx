import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, TaskDaily01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@shared/components/ui/button";

type VocabTestTopbarProps = {
	answeredCount: number;
	totalCount: number;
	accuracyPercent?: number;
	onClose: () => void;
	isResult?: boolean;
};

/**
 * Thanh điều hướng trên cùng của màn hình bài kiểm tra.
 * @param props.answeredCount - Số câu đã trả lời
 * @param props.totalCount - Tổng số câu
 * @param props.accuracyPercent - % chính xác (chỉ hiển thị ở màn kết quả)
 * @param props.onClose - Đóng/quay lại
 * @param props.isResult - Đang ở màn kết quả
 */
export function VocabTestTopbar({
	answeredCount,
	totalCount,
	accuracyPercent,
	onClose,
	isResult = false,
}: VocabTestTopbarProps) {
	return (
		<header className="flex h-12 w-full bg-neutral-50 items-center justify-between border-b px-4 md:px-6">
			<div className="flex items-center gap-2 text-sm">
				<HugeiconsIcon icon={TaskDaily01Icon} className="size-5" />
				<span>Kiểm tra</span>
			</div>

			<div className="flex flex-col items-center text-center">
				<span className="text-sm">
					{isResult && accuracyPercent !== undefined
						? `${answeredCount} / ${totalCount} - ${accuracyPercent}%`
						: `${answeredCount} / ${totalCount}`}
				</span>
			</div>

			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={onClose}
				aria-label="Đóng bài kiểm tra"
			>
				<HugeiconsIcon icon={Cancel01Icon} />
			</Button>
		</header>
	);
}
