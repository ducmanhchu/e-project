import { cn } from "@/shared/lib/utils";

type CreditPreviewProps = {
	credits: number;
	bonusPct: number;
	className?: string;
};

/**
 * Hiển thị số xu nhận và phần trăm bonus (nếu có).
 */
export function CreditPreview({
	credits,
	bonusPct,
	className,
}: CreditPreviewProps) {
	return (
		<div
			className={cn(
				"rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm",
				className,
			)}
		>
			<p>
				Nhận:{" "}
				<span className="font-semibold">
					{credits.toLocaleString("vi-VN")} xu
				</span>
				{bonusPct > 0 && (
					<span className="text-muted-foreground"> (+{bonusPct}% bonus)</span>
				)}
			</p>
		</div>
	);
}
