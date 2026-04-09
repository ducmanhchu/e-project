import type { RouteObject } from "react-router";

import { UserLayout } from "@user/layouts/user-layout";

export const userRoutes: RouteObject[] = [
	{
		path: "/",
		Component: UserLayout,
	},
];
