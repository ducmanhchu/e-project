import type { RouteObject } from "react-router";

import { UserLayout } from "@user/layouts/user-layout";
import { Login } from "@user/pages/login";
import { Register } from "@/domains/user/pages/register";
import { Home } from "@user/pages/home";
import { Writing } from "@user/pages/writing";
import { Speaking } from "@user/pages/speaking";
import { Vocabulary } from "@user/pages/vocabulary";

export const userRoutes: RouteObject[] = [
	{
		path: "/",
		Component: UserLayout,
		children: [
			{
				index: true,
				Component: Home,
			},
			{
				path: "writing",
				Component: Writing,
			},
			{
				path: "speaking",
				Component: Speaking,
			},
			{
				path: "vocabulary",
				Component: Vocabulary,
			},
		],
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
