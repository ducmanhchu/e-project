import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";
import { Link } from "react-router";
import { cn } from "@shared/lib/utils";

import { Button } from "@shared/components/ui/button";

type IconProps = ComponentProps<typeof HugeiconsIcon>;

export function MethodCard({
	icon,
	title,
	description,
	to,
	className,
}: {
	icon: IconProps["icon"];
	title: string;
	description: string;
	to: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex h-full w-full flex-col gap-8 rounded-4xl bg-primary p-8 text-primary-foreground",
				className,
			)}
		>
			<HugeiconsIcon icon={icon} size={34} />
			<div className="flex flex-1 flex-col gap-3">
				<h3 className="text-2xl font-extrabold">{title}</h3>
				<p className="text-base/7">{description}</p>
			</div>
			<Button
				asChild
				variant="ghost"
				className="mt-auto border border-primary-foreground"
			>
				<Link to={to}>Bắt đầu</Link>
			</Button>
		</div>
	);
}
