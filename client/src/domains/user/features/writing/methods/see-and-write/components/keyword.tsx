import type { KeyboardEvent } from "react";

import type { SAWKeyword } from "@shared/types/see-and-write";
import { cn } from "@shared/lib/utils";

type SAWKeywordProps = {
	keyword: SAWKeyword;
	status?: "correct" | "wrong" | "missed";
	selected?: boolean;
	disabled?: boolean;
	onClick?: () => void;
};

export function SAWKeyword({
	keyword,
	status,
	selected = false,
	disabled = false,
	onClick,
}: SAWKeywordProps) {
	const isInteractive = !!onClick && !disabled;
	const isSelectedNoStatus = selected && !status;

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (!isInteractive) return;
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onClick?.();
		}
	};

	return (
		<div
			role={onClick ? "button" : undefined}
			tabIndex={isInteractive ? 0 : undefined}
			aria-pressed={onClick ? selected : undefined}
			aria-disabled={disabled || undefined}
			onClick={isInteractive ? onClick : undefined}
			onKeyDown={handleKeyDown}
			className={cn(
				"flex flex-col place-content-center p-3 gap-2 items-center border border-secondary-black rounded-2xl transition-colors select-none bg-neutral-50",
				status === "correct" && "bg-secondary-green",
				status === "wrong" && "bg-secondary-red",
				status === "missed" && "bg-secondary-yellow",
				isSelectedNoStatus && "bg-secondary-black",
				isInteractive &&
					!selected &&
					!status &&
					"cursor-pointer hover:bg-neutral-200",
				isInteractive && selected && "cursor-pointer",
				disabled && "opacity-40 cursor-not-allowed",
			)}
		>
			<p
				className={cn(
					"text-base",
					isSelectedNoStatus ? "text-secondary-white" : "text-secondary-black",
				)}
			>
				{keyword.word}
			</p>
			{keyword.meaning && (
				<p
					className={cn(
						"text-sm font-light italic text-center",
						isSelectedNoStatus
							? "text-secondary-white"
							: "text-secondary-black",
					)}
				>
					{keyword.meaning}
				</p>
			)}
		</div>
	);
}
