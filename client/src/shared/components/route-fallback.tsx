import { Skeleton } from "@shared/components/ui/skeleton";

/**
 * Fallback Suspense khi lazy route đang tải chunk.
 * @returns Skeleton layout nhẹ trong vùng Outlet
 */
export function RouteFallback() {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy="true"
			className="flex w-full flex-col gap-4"
		>
			<Skeleton className="h-8 w-48 max-w-full" />
			<Skeleton className="h-4 w-72 max-w-full" />
			<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
				<Skeleton className="h-32 md:col-span-2" />
				<Skeleton className="h-32" />
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
			</div>
			<span className="sr-only">Đang tải trang...</span>
		</div>
	);
}
