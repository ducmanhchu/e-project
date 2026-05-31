import { Suspense } from "react";
import { Outlet } from "react-router";

import { RouteFallback } from "@shared/components/route-fallback";

export function SpeakingLayout() {
	return (
		<div className="min-h-full">
			<Suspense fallback={<RouteFallback />}>
				<Outlet />
			</Suspense>
		</div>
	);
}
