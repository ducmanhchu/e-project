import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, CircleIcon } from "@hugeicons/core-free-icons";

import { Badge } from "@shared/components/ui/badge";
import { cn } from "@shared/lib/utils";

export function VocabBadge({ status }: { status: "unknown" | "known" }) {
	return (
		<Badge
			className={cn(
				status === "known"
					? "bg-green-100 text-green-700"
					: "bg-orange-100 text-orange-700",
			)}
		>
			<HugeiconsIcon
				icon={status === "known" ? CheckmarkCircle02Icon : CircleIcon}
			/>
			{status === "known" ? "Thành thạo" : "Đang học"}
		</Badge>
	);
}
