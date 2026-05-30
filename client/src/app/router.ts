import { createBrowserRouter } from "react-router";

import { userRoutes } from "@user/routes";
import { adminRoutes } from "@admin/routes";
import { rootAuthLoader } from "@/shared/lib/auth-loaders";
import { RootErrorBoundary } from "@/shared/lib/root-error-boundary";
import { FallbackScreen } from "@/shared/components/fallback-screen";

import { ShellLayout } from "./shell";

export const router = createBrowserRouter([
	{
		id: "root",
		Component: ShellLayout,
		ErrorBoundary: RootErrorBoundary,
		HydrateFallback: FallbackScreen,
		loader: rootAuthLoader,
		children: [...userRoutes, ...adminRoutes],
	},
]);
