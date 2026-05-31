import type { RouteObject } from "react-router";

import { lazyRoute } from "@shared/lib/lazy-route";
import { requireAdminLoader } from "@shared/lib/auth-loaders";

export const adminRoutes: RouteObject[] = [
	{
		path: "/admin/login",
		...lazyRoute(() => import("@admin/features/auth/pages/login"), "Login"),
	},
	{
		loader: requireAdminLoader,
		...lazyRoute(() => import("@admin/shell/admin-layout"), "AdminLayout"),
		children: [
			{
				path: "/admin/reverse-translate",
				...lazyRoute(
					() =>
						import("@admin/features/writing/methods/reverse-translate/pages"),
					"ReverseTranslate",
				),
			},
			{
				path: "/admin/see-and-write",
				...lazyRoute(
					() => import("@admin/features/writing/methods/see-and-write/pages"),
					"SeeAndWrite",
				),
			},
			{
				path: "/admin/paraphrase",
				...lazyRoute(
					() => import("@admin/features/writing/methods/paraphrase/pages"),
					"Paraphrase",
				),
			},
			{
				path: "/admin/conversation",
				...lazyRoute(
					() => import("@admin/features/speaking/methods/conversation/pages"),
					"Conversation",
				),
			},
			{
				path: "/admin/dashboard",
				...lazyRoute(
					() => import("@admin/features/dashboard/pages"),
					"Dashboard",
				),
			},
		],
	},
];
