import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/shared/lib/utils";

type InsufficientDataProps = {
	className?: string;
};

/**
 * Trạng thái khi không đủ dữ liệu để vẽ biểu đồ.
 * @param props.className — class bổ sung cho vùng hiển thị
 */
export function InsufficientData({ className }: InsufficientDataProps) {
	return (
		<div
			className={cn(
				"flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground",
				className,
			)}
		>
			<HugeiconsIcon
				icon={InformationCircleIcon}
				className="size-8 text-muted-foreground"
			/>
			<p>Dữ liệu không đủ, bạn hãy làm thêm bài tập nhé!</p>
		</div>
	);
}
