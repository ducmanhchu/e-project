import type { ComponentProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
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
				"flex h-[45vh] w-full flex-col gap-8 rounded-4xl p-8 text-secondary-black bg-secondary-green group hover:bg-secondary-yellow transition-colors duration-300",
				className,
			)}
		>
			<Link to={to} className="flex h-full flex-col justify-between">
				<div className="flex flex-col gap-4">
					<HugeiconsIcon icon={icon} size={28} />
					<h3 className="text-2xl font-black">{title}</h3>
				</div>
				<div className="flex flex-col gap-6">
					<p className="text-base/7">{description}</p>
					<div className="flex items-center gap-4">
						<p>Bắt đầu</p>
						<Button
							variant="outline"
							size="icon-sm"
							className="bg-secondary-black border-secondary-black group-hover:bg-secondary-yellow"
						>
							<HugeiconsIcon
								icon={ArrowRight02Icon}
								size={24}
								className="text-secondary-white group-hover:text-secondary-black"
							/>
						</Button>
					</div>
				</div>
			</Link>
		</div>
	);
}
