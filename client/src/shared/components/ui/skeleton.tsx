import { cn } from "@/shared/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			className={cn("animate-pulse rounded-xl bg-gray-300", className)}
			{...props}
		/>
	);
}

export { Skeleton };
