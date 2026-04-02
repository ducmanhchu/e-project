import type { RouteObject } from "react-router";
import UserLayout from "./layouts/UserLayout";

export const userRoutes: RouteObject[] = [
	{
		path: "/",
		Component: UserLayout,
	},
];
