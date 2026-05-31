import { Suspense } from "react";
import { Outlet } from "react-router";

import { RouteFallback } from "@shared/components/route-fallback";

export function WritingLayout() {
	return (
		<div className="min-h-full w-full">
			<Suspense fallback={<RouteFallback />}>
				<Outlet />
			</Suspense>
		</div>
	);
}
