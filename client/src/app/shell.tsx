import { Suspense } from "react";
import { Outlet } from "react-router";

import { RouteFallback } from "@shared/components/route-fallback";

export const ShellLayout = () => (
	<Suspense fallback={<RouteFallback />}>
		<Outlet />
	</Suspense>
);
