import { Suspense } from "react";
import { Outlet } from "react-router";

import { RouteFallback } from "@shared/components/route-fallback";

/**
 * Khung layout module từ vựng: nội dung chính + sidebar.
 */
export function VocabularyLayout() {
	return (
		<div className="min-h-full w-full">
			<Suspense fallback={<RouteFallback />}>
				<Outlet />
			</Suspense>
		</div>
	);
}
