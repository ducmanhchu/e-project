import { createBrowserRouter } from "react-router";

import { userRoutes } from "@user/routes";
import { adminRoutes } from "@admin/routes";
import { rootAuthLoader } from "@/shared/lib/auth-loaders";
import { FallbackScreen } from "@/shared/components/fallback-screen";

import { Root } from "./root";

export const router = createBrowserRouter([
	{
		id: "root",
		Component: Root,
		HydrateFallback: FallbackScreen,
		loader: rootAuthLoader,
		children: [...userRoutes, ...adminRoutes],
	},
]);
