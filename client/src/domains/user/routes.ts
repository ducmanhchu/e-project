import type { RouteObject } from "react-router";

import { UserLayout } from "@user/layouts/user-layout";
import { Login } from "@user/pages/login";
import { Register } from "@/domains/user/pages/register";

export const userRoutes: RouteObject[] = [
	{
		path: "/",
		Component: UserLayout,
	},
	{
		path: "/login",
		Component: Login,
	},
	{
		path: "/register",
		Component: Register,
	},
];
